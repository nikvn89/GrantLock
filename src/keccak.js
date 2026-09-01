// Minimal dependency-free Keccak-256 for deterministic contract ID derivation.
// Keccak-256 is NOT NIST SHA3-256: the padding/domain byte here is 0x01.
// Input is a JavaScript string encoded as UTF-8; output is 64 lowercase hex chars.

const MASK_64 = (1n << 64n) - 1n
const RATE_BYTES = 136 // 1088-bit rate for Keccak-256

const ROUND_CONSTANTS = [
  0x0000000000000001n, 0x0000000000008082n,
  0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n,
  0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n,
  0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn,
  0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n,
  0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n,
  0x0000000080000001n, 0x8000000080008008n,
]

const ROTATION = [
   0,  1, 62, 28, 27,
  36, 44,  6, 55, 20,
   3, 10, 43, 25, 39,
  41, 45, 15, 21,  8,
  18,  2, 61, 56, 14,
]

function rotl64(value, shift) {
  const n = BigInt(shift)
  if (n === 0n) return value & MASK_64
  return ((value << n) | (value >> (64n - n))) & MASK_64
}

function keccakF(state) {
  const c = new Array(5).fill(0n)
  const d = new Array(5).fill(0n)
  const b = new Array(25).fill(0n)

  for (let round = 0; round < 24; round += 1) {
    // Theta
    for (let x = 0; x < 5; x += 1) {
      c[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]
    }
    for (let x = 0; x < 5; x += 1) {
      d[x] = c[(x + 4) % 5] ^ rotl64(c[(x + 1) % 5], 1)
    }
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        state[x + 5 * y] = (state[x + 5 * y] ^ d[x]) & MASK_64
      }
    }

    // Rho + Pi
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const source = x + 5 * y
        const targetX = y
        const targetY = (2 * x + 3 * y) % 5
        b[targetX + 5 * targetY] = rotl64(state[source], ROTATION[source])
      }
    }

    // Chi
    for (let y = 0; y < 5; y += 1) {
      const row = 5 * y
      for (let x = 0; x < 5; x += 1) {
        state[row + x] = (
          b[row + x] ^ ((~b[row + ((x + 1) % 5)] & MASK_64) & b[row + ((x + 2) % 5)])
        ) & MASK_64
      }
    }

    // Iota
    state[0] = (state[0] ^ ROUND_CONSTANTS[round]) & MASK_64
  }
}

function xorBlock(state, block) {
  for (let lane = 0; lane < RATE_BYTES / 8; lane += 1) {
    let value = 0n
    const start = lane * 8
    for (let i = 0; i < 8; i += 1) {
      value |= BigInt(block[start + i]) << BigInt(8 * i)
    }
    state[lane] = (state[lane] ^ value) & MASK_64
  }
}

function laneToBytes(value, output, offset, max) {
  for (let i = 0; i < 8 && offset + i < max; i += 1) {
    output[offset + i] = Number((value >> BigInt(8 * i)) & 0xffn)
  }
}

export function keccak256(input) {
  const bytes = new TextEncoder().encode(String(input))
  const state = new Array(25).fill(0n)
  let offset = 0

  while (offset + RATE_BYTES <= bytes.length) {
    xorBlock(state, bytes.subarray(offset, offset + RATE_BYTES))
    keccakF(state)
    offset += RATE_BYTES
  }

  const finalBlock = new Uint8Array(RATE_BYTES)
  finalBlock.set(bytes.subarray(offset))
  finalBlock[bytes.length - offset] ^= 0x01 // Keccak domain padding
  finalBlock[RATE_BYTES - 1] ^= 0x80
  xorBlock(state, finalBlock)
  keccakF(state)

  const out = new Uint8Array(32)
  let outOffset = 0
  while (outOffset < out.length) {
    const lanesThisRound = Math.min(RATE_BYTES / 8, Math.ceil((out.length - outOffset) / 8))
    for (let lane = 0; lane < lanesThisRound; lane += 1) {
      laneToBytes(state[lane], out, outOffset + lane * 8, out.length)
    }
    outOffset += lanesThisRound * 8
    if (outOffset < out.length) keccakF(state)
  }

  return Array.from(out, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

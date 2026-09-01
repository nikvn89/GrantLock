export default function handler(_req, res) {
  res.status(200).json({
    ok: true,
    project: 'GrantLock',
    network: 'GenLayer StudioNet',
    contract: '0x7cDcdE83B2a5192ACC00412cf192684c951081cc',
    sourceSha256: 'c82e52db2b1c3e0192db8212f08cc42ad749388e2cc1b8fa1da7733b0d04e3d3',
  })
}

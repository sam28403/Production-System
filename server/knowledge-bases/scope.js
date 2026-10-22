export function knowledgeBaseScope(db) {
  return (req, res, next) => {
    const baseId = Number(req.params.baseId)
    if (!Number.isSafeInteger(baseId) || baseId < 1) {
      return res.status(400).json({ message: '知识库编号无效。' })
    }
    if (!db.prepare('SELECT id FROM knowledge_bases WHERE id = ?').get(baseId)) {
      return res.status(404).json({ message: '知识库不存在。' })
    }
    req.baseId = baseId
    next()
  }
}

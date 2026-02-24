const DEFAULT_TITLE = 'Research Paper'

const toId = (value) =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

const trimText = (text, maxLen = 240) => {
    if (!text) {
        return ''
    }
    if (text.length <= maxLen) {
        return text
    }
    return `${text.slice(0, maxLen)}...`
}

export function buildGraphFromAnalysis(analysis) {
    if (!analysis) {
        return { nodes: [], links: [] }
    }

    const nodes = []
    const links = []
    const nodeIds = new Set()

    const addNode = (node) => {
        if (!node || !node.id || nodeIds.has(node.id)) {
            return
        }
        nodeIds.add(node.id)
        nodes.push(node)
    }

    const addLink = (source, target, type = 'related') => {
        if (!source || !target || source === target) {
            return
        }
        links.push({ source, target, type })
    }

    const paperTitle = analysis?.global?.inferred_title || DEFAULT_TITLE
    const paperNodeId = `paper-${toId(paperTitle) || 'main'}`

    addNode({
        id: paperNodeId,
        name: paperTitle,
        type: 'paper',
        value: 22,
        details: trimText(analysis?.global?.global_summary || ''),
    })

    const sectionNodes = analysis?.sections || []

    sectionNodes.forEach((section, sectionIndex) => {
        const sectionId = `section-${sectionIndex}-${toId(section.section_name || 'section')}`
        addNode({
            id: sectionId,
            name: section.section_name || `Section ${sectionIndex + 1}`,
            type: 'section',
            value: 14,
            details: trimText(section.summary || ''),
            pageStart: section.page_start,
        })
        addLink(paperNodeId, sectionId, 'contains')

            ; (section.key_terms || []).slice(0, 25).forEach((term) => {
                const termId = `term-${toId(term)}`
                addNode({
                    id: termId,
                    name: term,
                    type: 'term',
                    value: 7,
                })
                addLink(sectionId, termId, 'mentions')
            })

            ; (section.key_points || []).slice(0, 8).forEach((point, pointIndex) => {
                const pointId = `point-${sectionIndex}-${pointIndex}`
                addNode({
                    id: pointId,
                    name: `Key Point ${pointIndex + 1}`,
                    type: 'point',
                    value: 5,
                    details: trimText(point, 180),
                })
                addLink(sectionId, pointId, 'explains')
            })
    })

        ; (analysis?.global?.key_contributions || []).slice(0, 8).forEach((item, index) => {
            const contributionId = `contribution-${index}`
            addNode({
                id: contributionId,
                name: `Contribution ${index + 1}`,
                type: 'contribution',
                value: 8,
                details: trimText(item, 200),
            })
            addLink(paperNodeId, contributionId, 'contributes')
        })

        ; (analysis?.global?.limitations || []).slice(0, 6).forEach((item, index) => {
            const limitationId = `limitation-${index}`
            addNode({
                id: limitationId,
                name: `Limitation ${index + 1}`,
                type: 'limitation',
                value: 6,
                details: trimText(item, 200),
            })
            addLink(paperNodeId, limitationId, 'limits')
        })

        ; (analysis?.global?.future_work || []).slice(0, 6).forEach((item, index) => {
            const futureId = `future-${index}`
            addNode({
                id: futureId,
                name: `Future Work ${index + 1}`,
                type: 'future',
                value: 6,
                details: trimText(item, 200),
            })
            addLink(paperNodeId, futureId, 'extends')
        })

    return { nodes, links }
}

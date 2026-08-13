import type { Locale } from "@/lib/i18n"

export const projects: Record<Locale, Record<string, string>> = {
  en: {
    "projects.meta.wordsProgress": "{{current}} / {{target}} words",
    "projects.meta.type.novel": "Novel",
    "projects.meta.type.trilogy": "Trilogy",
    "projects.meta.type.series": "Series",
    "projects.meta.type.short_story_collection": "Short Story Collection",
    "projects.meta.type.graphic_novel": "Graphic Novel",
    "projects.meta.type.screenplay": "Screenplay",
    "projects.meta.visibility.private": "Private",
    "projects.meta.visibility.organization": "Organization",
    "projects.meta.visibility.public": "Public",
    "projects.meta.status.draft": "draft",
    "projects.meta.status.in_progress": "in_progress",
    "projects.meta.status.completed": "completed",
    "projects.meta.status.published": "published",
    "projects.meta.status.archived": "archived",

    "projects.list.breadcrumb": "Projects",
    "projects.list.title": "My Projects",
    "projects.list.description": "Manage your writing projects",
    "projects.list.newProject": "New Project",
    "projects.list.createDialog.title": "Create New Project",
    "projects.list.createDialog.description":
      "Start your next writing project. You can always edit these details later.",
    "projects.list.form.titleLabel": "Title *",
    "projects.list.form.titlePlaceholder": "The Great Adventure",
    "projects.list.form.descriptionPlaceholder": "A brief description of your project...",
    "projects.list.form.projectType": "Project Type",
    "projects.list.form.genre": "Genre",
    "projects.list.form.genrePlaceholder": "e.g., Fantasy, Sci-Fi",
    "projects.list.form.targetWords": "Target Words",
    "projects.list.form.visibility": "Visibility",
    "projects.list.actions.createProject": "Create Project",
    "projects.list.empty.title": "No projects yet",
    "projects.list.empty.description": "Create your first project to get started writing!",
    "projects.list.empty.cta": "Create Your First Project",
    "projects.list.feedback.createFailed": "Failed to create project",
    "projects.list.feedback.titleRequired": "Title is required",

    "projects.detail.loading": "Loading project...",
    "projects.detail.notFoundTitle": "Project not found",
    "projects.detail.backToProjects": "Back to Projects",
    "projects.detail.showAi": "Show AI",
    "projects.detail.hideAi": "Hide AI",
    "projects.detail.nav.write": "Write",
    "projects.detail.nav.outline": "Outline",
    "projects.detail.nav.characters": "Characters",
    "projects.detail.nav.settings": "Settings",
    "projects.detail.characters.title": "Characters Coming Soon",
    "projects.detail.characters.description":
      "This is where you'll be able to create and manage your project's characters, their profiles, relationships, and development arcs.",
    "projects.detail.outline.title": "Canvas Available in Projects",
    "projects.detail.outline.description":
      "The Story Canvas feature is now available in the main Projects section. Use the new Canvas tool to create and manage your story structure with drag-and-drop elements.",

    "projects.card.labels.type": "Type:",
    "projects.card.labels.genre": "Genre:",
    "projects.card.labels.progress": "Progress:",

    "projects.editDialog.title": "Edit Project",
    "projects.editDialog.description":
      "Update your project details. Changes will be saved immediately.",
    "projects.editDialog.form.titleLabel": "Title *",
    "projects.editDialog.form.titlePlaceholder": "The Great Adventure",
    "projects.editDialog.form.descriptionPlaceholder": "A brief description of your project...",
    "projects.editDialog.form.projectType": "Project Type",
    "projects.editDialog.form.genre": "Genre",
    "projects.editDialog.form.genrePlaceholder": "e.g., Fantasy, Sci-Fi",
    "projects.editDialog.form.targetWords": "Target Words",
    "projects.editDialog.form.visibility": "Visibility",
    "projects.editDialog.actions.updating": "Updating...",
    "projects.editDialog.actions.updateProject": "Update Project",
    "projects.editDialog.feedback.updatedTitle": "Project updated successfully! ✨",
    "projects.editDialog.feedback.updatedDescription": "Your changes have been saved.",
    "projects.editDialog.feedback.updateFailed": "Failed to update project",
    "projects.editDialog.feedback.tryAgain": "Please try again.",
    "projects.editDialog.feedback.titleRequired": "Title is required",
    "projects.editDialog.feedback.updateUnavailable": "Update method not available",

    "projects.export.button": "Export",
    "projects.export.exporting": "Exporting…",
    "projects.export.empty": "There's nothing to export yet.",
    "projects.export.success": "Manuscript exported as Markdown",
    "projects.export.failed": "Export failed: {{message}}",
    "projects.export.unknownError": "unknown error",

    "projects.detail.settings.title": "Writer Skills",
    "projects.detail.settings.description":
      "Skills and learned style memory are attached to this novel and applied to every future AI conversation.",
    "projects.detail.settings.memory.title": "Persistent style memory",
    "projects.detail.settings.memory.description":
      "Analyze a bounded sample of the manuscript and remember its voice, rhythm, viewpoint, dialogue, imagery, and pacing.",
    "projects.detail.settings.memory.learn": "Learn from manuscript",
    "projects.detail.settings.memory.learning": "Learning...",
    "projects.detail.settings.memory.voice": "Voice",
    "projects.detail.settings.memory.sentenceRhythm": "Sentence rhythm",
    "projects.detail.settings.memory.povTense": "Point of view and tense",
    "projects.detail.settings.memory.dialogue": "Dialogue",
    "projects.detail.settings.memory.imagery": "Imagery",
    "projects.detail.settings.memory.pacing": "Pacing",
    "projects.detail.settings.memory.avoid": "Avoid",
    "projects.detail.settings.memory.learnedFrom":
      "Learned from {{chapters}} chapter(s) and {{words}} words, updated {{updatedAt}}.",
    "projects.detail.settings.memory.empty":
      "No style memory yet. Write some chapters, configure an AI Provider, then run learning.",
    "projects.detail.settings.skills.builtIn": "Built in",
    "projects.detail.settings.skills.imported": "Imported",
    "projects.detail.settings.skills.editAria": "Edit {{name}}",
    "projects.detail.settings.skills.deleteAria": "Delete {{name}}",
    "projects.detail.settings.skills.sourceLine": "Source: {{source}} · License: {{license}}",
    "projects.detail.settings.skills.original": "Original",
    "projects.detail.settings.import.title": "Import a Writer Skill",
    "projects.detail.settings.import.description":
      "Import concise methods, structural rules, and checklists—not full novels or copyrighted passages.",
    "projects.detail.settings.import.format": "Format",
    "projects.detail.settings.import.formatMarkdown": "Markdown",
    "projects.detail.settings.import.formatJson": "JSON",
    "projects.detail.settings.import.placeholderMarkdown": `# Skill name

Description

## Instructions
...

## Checklist
- ...`,
    "projects.detail.settings.import.placeholderJson": `{
  "name": "Skill name",
  "description": "...",
  "instructions": "...",
  "checklist": []
}`,
    "projects.detail.settings.import.button": "Import and enable",
    "projects.detail.settings.import.importing": "Importing...",
    "projects.detail.settings.edit.title": "Edit Writer Skill",
    "projects.detail.settings.edit.description":
      "Changes affect every future AI conversation for projects using this skill.",
    "projects.detail.settings.edit.instructions": "Instructions",
    "projects.detail.settings.edit.checklist": "Checklist, one item per line",
    "projects.detail.settings.edit.saveChanges": "Save changes",
    "projects.detail.settings.feedback.imported": "Writer Skill imported",
    "projects.detail.settings.feedback.deleted": "Writer Skill deleted",
    "projects.detail.settings.feedback.updated": "Writer Skill updated",
    "projects.detail.settings.feedback.learned": "Project style memory updated",
    "projects.detail.settings.feedback.noSkillSelected": "No Writer Skill selected",
    "projects.detail.settings.builtIns.characterInteraction.name": "Character Interaction Dynamics",
    "projects.detail.settings.builtIns.characterInteraction.description":
      "Build scenes from each character's immediate drive, boundaries, conflicts, and unexpected alliances.",
    "projects.detail.settings.builtIns.characterInteraction.instructions":
      "Before drafting or revising a multi-character scene:\n\n1. PROFILE — State every character's immediate goal and guardrail.\n2. INTERACTION MAP — Find where those goals collide or unexpectedly align.\n3. SCENE SYNTHESIS — Let the strongest conflict or alliance produce the scene's turn.\n4. FLATNESS CHECK — Add a competing drive or remove characters who do not affect the interaction.",
    "projects.detail.settings.builtIns.characterInteraction.checklist.1":
      "List each on-page character's immediate drive and guardrail.",
    "projects.detail.settings.builtIns.characterInteraction.checklist.2":
      "Identify at least one tension pair or unexpected alliance.",
    "projects.detail.settings.builtIns.characterInteraction.checklist.3":
      "Make the scene's turning point follow from that interaction.",
    "projects.detail.settings.builtIns.characterInteraction.checklist.4":
      "Flag characters whose drives do not interact with anyone else's.",
    "projects.detail.settings.builtIns.parameterizedProse.name": "Parameterized Prose Practice",
    "projects.detail.settings.builtIns.parameterizedProse.description":
      "Change point of view or tense while preserving voice, then check for structural drift.",
    "projects.detail.settings.builtIns.parameterizedProse.instructions":
      "Use this pass when converting or testing a passage:\n\n1. PARAMETERIZE — State the current and target point of view and tense.\n2. REWRITE WITH CONSTRAINTS — Preserve diction, rhythm, and interiority.\n3. CHECK — Look separately for tense leaks, point-of-view leaks, and staging drift.\n4. DIAGNOSE — Compare versions to see whether the scene's tension survives the structural change.",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.1":
      "State the current and target point of view and tense.",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.2":
      "Confirm diction, rhythm, and interiority remain consistent.",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.3":
      "Scan for verbs left in the old tense.",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.4":
      "Scan for knowledge or sensations unavailable to the new viewpoint.",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.5":
      "Confirm positions, possessions, and timing did not drift.",
    "projects.detail.settings.builtIns.chapterContinuity.name": "Stateful Chapter Continuity",
    "projects.detail.settings.builtIns.chapterContinuity.description":
      "Carry factual state between chapters and periodically audit the manuscript for continuity drift.",
    "projects.detail.settings.builtIns.chapterContinuity.instructions":
      "Use this pass throughout a multi-chapter manuscript:\n\n1. CARRY-FORWARD STATE — Record locations, new knowledge, objects, promises, injuries, and elapsed time.\n2. OPENING CHECK — Ensure the next chapter starts consistently or explains the transition.\n3. CONTINUITY AUDIT — Review accumulated state notes for contradictions every few chapters.\n4. Keep notes short and factual rather than retelling the plot.",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.1":
      "Write a brief carry-forward state after every chapter.",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.2":
      "Check the next opening against that state.",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.3":
      "Ensure characters do not relearn information they already know.",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.4":
      "Periodically audit all state notes for drift or contradictions.",
  },
  "zh-CN": {
    "projects.meta.wordsProgress": "{{current}} / {{target}} 字",
    "projects.meta.type.novel": "小说",
    "projects.meta.type.trilogy": "三部曲",
    "projects.meta.type.series": "系列作品",
    "projects.meta.type.short_story_collection": "短篇小说集",
    "projects.meta.type.graphic_novel": "图像小说",
    "projects.meta.type.screenplay": "剧本",
    "projects.meta.visibility.private": "私有",
    "projects.meta.visibility.organization": "组织内",
    "projects.meta.visibility.public": "公开",
    "projects.meta.status.draft": "草稿",
    "projects.meta.status.in_progress": "进行中",
    "projects.meta.status.completed": "已完成",
    "projects.meta.status.published": "已发布",
    "projects.meta.status.archived": "已归档",

    "projects.list.breadcrumb": "项目",
    "projects.list.title": "我的项目",
    "projects.list.description": "管理你的写作项目",
    "projects.list.newProject": "新建项目",
    "projects.list.createDialog.title": "创建新项目",
    "projects.list.createDialog.description":
      "开始你的下一个写作项目。这些信息之后都可以随时修改。",
    "projects.list.form.titleLabel": "标题 *",
    "projects.list.form.titlePlaceholder": "伟大的冒险",
    "projects.list.form.descriptionPlaceholder": "简要描述一下你的项目...",
    "projects.list.form.projectType": "项目类型",
    "projects.list.form.genre": "题材",
    "projects.list.form.genrePlaceholder": "例如：奇幻、科幻",
    "projects.list.form.targetWords": "目标字数",
    "projects.list.form.visibility": "可见性",
    "projects.list.actions.createProject": "创建项目",
    "projects.list.empty.title": "还没有项目",
    "projects.list.empty.description": "创建你的第一个项目，开始写作吧！",
    "projects.list.empty.cta": "创建你的第一个项目",
    "projects.list.feedback.createFailed": "创建项目失败",
    "projects.list.feedback.titleRequired": "标题为必填项",

    "projects.detail.loading": "正在加载项目...",
    "projects.detail.notFoundTitle": "未找到项目",
    "projects.detail.backToProjects": "返回项目列表",
    "projects.detail.showAi": "显示 AI",
    "projects.detail.hideAi": "隐藏 AI",
    "projects.detail.nav.write": "写作",
    "projects.detail.nav.outline": "大纲",
    "projects.detail.nav.characters": "角色",
    "projects.detail.nav.settings": "设置",
    "projects.detail.characters.title": "角色功能即将推出",
    "projects.detail.characters.description":
      "你将能够在这里创建和管理项目中的角色，包括角色档案、关系网络以及成长弧线。",
    "projects.detail.outline.title": "项目中可用的 Canvas",
    "projects.detail.outline.description":
      "Story Canvas 功能现已在主项目区域提供。使用新的 Canvas 工具，通过拖放元素来创建和管理你的故事结构。",

    "projects.card.labels.type": "类型：",
    "projects.card.labels.genre": "题材：",
    "projects.card.labels.progress": "进度：",

    "projects.editDialog.title": "编辑项目",
    "projects.editDialog.description": "更新你的项目详情。更改将立即保存。",
    "projects.editDialog.form.titleLabel": "标题 *",
    "projects.editDialog.form.titlePlaceholder": "伟大的冒险",
    "projects.editDialog.form.descriptionPlaceholder": "简要描述一下你的项目...",
    "projects.editDialog.form.projectType": "项目类型",
    "projects.editDialog.form.genre": "题材",
    "projects.editDialog.form.genrePlaceholder": "例如：奇幻、科幻",
    "projects.editDialog.form.targetWords": "目标字数",
    "projects.editDialog.form.visibility": "可见性",
    "projects.editDialog.actions.updating": "更新中...",
    "projects.editDialog.actions.updateProject": "更新项目",
    "projects.editDialog.feedback.updatedTitle": "项目已成功更新！✨",
    "projects.editDialog.feedback.updatedDescription": "你的更改已保存。",
    "projects.editDialog.feedback.updateFailed": "更新项目失败",
    "projects.editDialog.feedback.tryAgain": "请重试。",
    "projects.editDialog.feedback.titleRequired": "标题为必填项",
    "projects.editDialog.feedback.updateUnavailable": "更新功能不可用",

    "projects.export.button": "导出",
    "projects.export.exporting": "导出中…",
    "projects.export.empty": "暂时没有可导出的内容。",
    "projects.export.success": "手稿已导出为 Markdown",
    "projects.export.failed": "导出失败：{{message}}",
    "projects.export.unknownError": "未知错误",

    "projects.detail.settings.title": "写作技能",
    "projects.detail.settings.description":
      "写作技能与学习到的风格记忆会附加到这部小说上，并应用到之后的每一次 AI 对话中。",
    "projects.detail.settings.memory.title": "持久风格记忆",
    "projects.detail.settings.memory.description":
      "分析手稿中的有限样本，并记住其声音、节奏、视角、对话、意象和叙事节拍。",
    "projects.detail.settings.memory.learn": "从手稿中学习",
    "projects.detail.settings.memory.learning": "学习中...",
    "projects.detail.settings.memory.voice": "语言风格",
    "projects.detail.settings.memory.sentenceRhythm": "句式节奏",
    "projects.detail.settings.memory.povTense": "视角与时态",
    "projects.detail.settings.memory.dialogue": "对话",
    "projects.detail.settings.memory.imagery": "意象",
    "projects.detail.settings.memory.pacing": "节奏把控",
    "projects.detail.settings.memory.avoid": "避免",
    "projects.detail.settings.memory.learnedFrom":
      "已从 {{chapters}} 个章节、{{words}} 字中学习，并于 {{updatedAt}} 更新。",
    "projects.detail.settings.memory.empty":
      "还没有风格记忆。先写一些章节、配置 AI 提供商，然后再运行学习。",
    "projects.detail.settings.skills.builtIn": "内置",
    "projects.detail.settings.skills.imported": "已导入",
    "projects.detail.settings.skills.editAria": "编辑 {{name}}",
    "projects.detail.settings.skills.deleteAria": "删除 {{name}}",
    "projects.detail.settings.skills.sourceLine": "来源：{{source}} · 许可证：{{license}}",
    "projects.detail.settings.skills.original": "原创",
    "projects.detail.settings.import.title": "导入写作技能",
    "projects.detail.settings.import.description":
      "导入简洁的方法、结构规则和检查清单——不要导入整部小说或受版权保护的段落。",
    "projects.detail.settings.import.format": "格式",
    "projects.detail.settings.import.formatMarkdown": "Markdown",
    "projects.detail.settings.import.formatJson": "JSON",
    "projects.detail.settings.import.placeholderMarkdown": `# 技能名称

描述

## 说明
...

## 检查清单
- ...`,
    "projects.detail.settings.import.placeholderJson": `{
  "name": "技能名称",
  "description": "...",
  "instructions": "...",
  "checklist": []
}`,
    "projects.detail.settings.import.button": "导入并启用",
    "projects.detail.settings.import.importing": "导入中...",
    "projects.detail.settings.edit.title": "编辑写作技能",
    "projects.detail.settings.edit.description":
      "更改会影响所有使用此技能的项目在未来的每一次 AI 对话。",
    "projects.detail.settings.edit.instructions": "说明",
    "projects.detail.settings.edit.checklist": "检查清单，每行一项",
    "projects.detail.settings.edit.saveChanges": "保存更改",
    "projects.detail.settings.feedback.imported": "写作技能已导入",
    "projects.detail.settings.feedback.deleted": "写作技能已删除",
    "projects.detail.settings.feedback.updated": "写作技能已更新",
    "projects.detail.settings.feedback.learned": "项目风格记忆已更新",
    "projects.detail.settings.feedback.noSkillSelected": "未选择写作技能",
    "projects.detail.settings.builtIns.characterInteraction.name": "角色互动动力",
    "projects.detail.settings.builtIns.characterInteraction.description":
      "从角色当下的目标、底线、冲突与意外合作出发构建场景。",
    "projects.detail.settings.builtIns.characterInteraction.instructions":
      "在起草多人场景前使用，也可用于检查平淡的场景：\n\n1. 角色画像——写明每个出场角色当下的具体目标，以及其不愿触碰的底线。\n2. 互动映射——找出目标之间正面冲突之处，以及不同目标意外同向、迫使角色合作之处。\n3. 场景合成——让最强的冲突或合作推动场景转折，不要先安排外部事件再硬套角色动机。\n4. 平淡检查——若所有目标都同向且没有互动，应加入竞争目标，或删减对场景不起作用的角色。",
    "projects.detail.settings.builtIns.characterInteraction.checklist.1":
      "逐一列出出场角色当下的目标与底线。",
    "projects.detail.settings.builtIns.characterInteraction.checklist.2":
      "至少找出一组目标冲突或意外合作。",
    "projects.detail.settings.builtIns.characterInteraction.checklist.3":
      "确认场景转折来自角色互动，而非纯粹的外部巧合。",
    "projects.detail.settings.builtIns.characterInteraction.checklist.4":
      "标出目标未与任何人发生作用的角色。",
    "projects.detail.settings.builtIns.parameterizedProse.name": "参数化文风练习",
    "projects.detail.settings.builtIns.parameterizedProse.description":
      "在保持声音不变的前提下调整视角或时态，并检查改写造成的结构漂移。",
    "projects.detail.settings.builtIns.parameterizedProse.instructions":
      "用于转换或测试段落的视角与时态：\n\n1. 参数化——明确当前与目标视角、当前与目标时态。\n2. 约束改写——保持用词、句子节奏和心理描写深度不变。\n3. 分项检查——分别查找时态泄漏、视角越界和场面调度漂移。\n4. 诊断比较——比较不同版本，判断场景张力是否经得住结构变化。",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.1":
      "写明当前及目标视角与时态。",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.2":
      "确认用词、节奏与心理描写深度前后一致。",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.3": "检查仍残留旧时态的动词。",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.4":
      "检查新视角无法感知或获知的信息。",
    "projects.detail.settings.builtIns.parameterizedProse.checklist.5":
      "确认人物位置、持有物和时间关系没有漂移。",
    "projects.detail.settings.builtIns.chapterContinuity.name": "章节状态连续性",
    "projects.detail.settings.builtIns.chapterContinuity.description":
      "在章节之间传递事实状态，并定期检查长篇手稿中的连续性漂移。",
    "projects.detail.settings.builtIns.chapterContinuity.instructions":
      "在多章节写作中持续使用：\n\n1. 状态传递——在章末记录主要角色所在位置、新获知的信息、物品、承诺、伤势与经过时间。\n2. 开篇检查——确认下一章的开头与上一状态一致，或明确交代了时间和地点跳转。\n3. 连续性审计——每隔几章通读累积状态，查找伤势、物品、知识和时间线的矛盾。\n4. 状态记录应简短、客观，只做连续性清单，不复述剧情。",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.1":
      "每章结束后写一条简短的状态记录。",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.2":
      "用上一章状态核对下一章开头。",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.3":
      "确认角色不会重复获知自己已经知道的信息。",
    "projects.detail.settings.builtIns.chapterContinuity.checklist.4":
      "定期检查全部状态记录中的漂移与矛盾。",
  },
}

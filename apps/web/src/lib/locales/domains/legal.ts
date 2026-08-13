import type { Locale } from "@/lib/i18n"

export const legal: Record<Locale, Record<string, string>> = {
  en: {
    "legal.privacy.backToHome": "Back to Home",
    "legal.privacy.title": "Privacy Policy",
    "legal.privacy.lastUpdated": "Last updated:",
    "legal.privacy.introduction.title": "Introduction",
    "legal.privacy.introduction.body": `ModernNovel ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered writing platform.`,
    "legal.privacy.collect.title": "Information We Collect",
    "legal.privacy.collect.personalTitle": "Personal Information",
    "legal.privacy.collect.personal.email":
      "Email address (for account creation and authentication)",
    "legal.privacy.collect.personal.name": "Name (optional, for personalization)",
    "legal.privacy.collect.personal.content": "Writing content and documents you create",
    "legal.privacy.collect.autoTitle": "Automatically Collected Information",
    "legal.privacy.collect.auto.usage": "Usage data and analytics",
    "legal.privacy.collect.auto.device": "Device and browser information",
    "legal.privacy.collect.auto.ip": "IP address and location data",
    "legal.privacy.collect.auto.cookies": "Cookies and similar tracking technologies",
    "legal.privacy.use.title": "How We Use Your Information",
    "legal.privacy.use.intro": "We use the information we collect to:",
    "legal.privacy.use.items.platform": "Provide and maintain our writing platform",
    "legal.privacy.use.items.auth": "Authenticate your account and ensure security",
    "legal.privacy.use.items.sync": "Save and sync your writing content across devices",
    "legal.privacy.use.items.ai": "Improve our AI assistance features",
    "legal.privacy.use.items.analytics": "Analyze usage patterns to enhance user experience",
    "legal.privacy.use.items.communicate": "Communicate with you about updates and features",
    "legal.privacy.security.title": "Data Storage and Security",
    "legal.privacy.security.p1":
      "Your data is stored securely using industry-standard encryption. We use Cloudflare D1 for data storage, which provides enterprise-grade security and compliance. Your writing content is encrypted both in transit and at rest.",
    "legal.privacy.security.p2":
      "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
    "legal.privacy.sharing.title": "Data Sharing and Disclosure",
    "legal.privacy.sharing.p1":
      "We do not sell, trade, or otherwise transfer your personal information to third parties, except:",
    "legal.privacy.sharing.items.consent": "With your explicit consent",
    "legal.privacy.sharing.items.legal": "To comply with legal obligations",
    "legal.privacy.sharing.items.rights": "To protect our rights and safety",
    "legal.privacy.sharing.items.transfer": "In connection with a business transfer or merger",
    "legal.privacy.sharing.p2":
      "We may use anonymized and aggregated data for research and analytics purposes that cannot be used to identify individual users.",
    "legal.privacy.rights.title": "Your Rights",
    "legal.privacy.rights.intro": "You have the right to:",
    "legal.privacy.rights.items.access": "Access your personal data",
    "legal.privacy.rights.items.correct": "Correct inaccurate information",
    "legal.privacy.rights.items.delete": "Delete your account and associated data",
    "legal.privacy.rights.items.export": "Export your writing content",
    "legal.privacy.rights.items.marketing": "Opt out of marketing communications",
    "legal.privacy.rights.items.withdraw": "Withdraw consent where applicable",
    "legal.privacy.rights.p2": `To exercise these rights, please contact us using the information provided in the "Contact Us" section below.`,
    "legal.privacy.cookies.title": "Cookies and Tracking Technologies",
    "legal.privacy.cookies.p1":
      "We use cookies and similar technologies to enhance your experience, remember your preferences, and analyze usage patterns. You can control cookie preferences through your browser settings.",
    "legal.privacy.cookies.p2":
      "Essential cookies are necessary for the platform to function properly and cannot be disabled. Optional cookies help us improve our services and can be disabled at any time.",
    "legal.privacy.openSource.title": "Open Source Commitment",
    "legal.privacy.openSource.p1":
      "ModernNovel is an open-source project licensed under AGPL-3.0. Our source code is publicly available on GitHub, allowing for transparency and community review of our privacy and security practices.",
    "legal.privacy.openSource.p2Prefix":
      "You can review our data handling practices, security implementations, and privacy measures by examining our source code at ",
    "legal.privacy.openSource.p2Suffix": ".",
    "legal.privacy.changes.title": "Changes to This Privacy Policy",
    "legal.privacy.changes.p1": `We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new Privacy Policy on this page and updating the "Last updated" date.`,
    "legal.privacy.changes.p2":
      "Your continued use of ModernNovel after any changes indicates your acceptance of the updated Privacy Policy.",
    "legal.privacy.contact.title": "Contact Us",
    "legal.privacy.contact.intro":
      "If you have any questions about this Privacy Policy or our privacy practices, please contact us:",
    "legal.privacy.contact.githubIssues": "GitHub Issues:",
    "legal.privacy.contact.email": "Email:",
    "legal.terms.backToHome": "Back to Home",
    "legal.terms.title": "Terms of Service",
    "legal.terms.lastUpdated": "Last updated:",
    "legal.terms.introduction.title": "Introduction",
    "legal.terms.introduction.p1": `Welcome to ModernNovel. These Terms of Service ("Terms") govern your use of the ModernNovel platform ("Service") operated by the ModernNovel project ("us," "we," or "our").`,
    "legal.terms.introduction.p2":
      "By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.",
    "legal.terms.acceptance.title": "Acceptance of Terms",
    "legal.terms.acceptance.p1":
      "By creating an account or using ModernNovel, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.",
    "legal.terms.acceptance.p2": `You must be at least 13 years old to use this Service. If you are under 18, you represent that you have your parent's or guardian's permission to use the Service.`,
    "legal.terms.service.title": "Description of Service",
    "legal.terms.service.intro": "ModernNovel is an AI-powered writing platform that provides:",
    "legal.terms.service.items.richText":
      "Rich text editing capabilities with real-time collaboration",
    "legal.terms.service.items.ai": "AI-assisted writing suggestions and improvements",
    "legal.terms.service.items.storage": "Document storage and synchronization",
    "legal.terms.service.items.export": "Export and sharing features",
    "legal.terms.service.items.analytics": "Writing analytics and insights",
    "legal.terms.service.p2": `The Service is provided on an "as is" basis and may be modified, updated, or discontinued at any time without prior notice.`,
    "legal.terms.accounts.title": "User Accounts",
    "legal.terms.accounts.intro":
      "To access certain features of the Service, you must create an account. You are responsible for:",
    "legal.terms.accounts.items.credentials":
      "Maintaining the confidentiality of your account credentials",
    "legal.terms.accounts.items.activities": "All activities that occur under your account",
    "legal.terms.accounts.items.accurate": "Providing accurate and up-to-date information",
    "legal.terms.accounts.items.notify": "Notifying us immediately of any unauthorized use",
    "legal.terms.accounts.p2":
      "We reserve the right to terminate accounts that violate these Terms or remain inactive for extended periods.",
    "legal.terms.acceptable.title": "Acceptable Use Policy",
    "legal.terms.acceptable.intro": "You agree not to use the Service to:",
    "legal.terms.acceptable.items.laws": "Violate any applicable laws or regulations",
    "legal.terms.acceptable.items.ip": "Infringe on intellectual property rights",
    "legal.terms.acceptable.items.harmful": "Upload harmful, offensive, or inappropriate content",
    "legal.terms.acceptable.items.access": "Attempt to gain unauthorized access to our systems",
    "legal.terms.acceptable.items.malware": "Distribute malware or engage in malicious activities",
    "legal.terms.acceptable.items.spam": "Spam, harass, or abuse other users",
    "legal.terms.acceptable.items.commercial":
      "Use the Service for commercial purposes without permission",
    "legal.terms.acceptable.p2":
      "We reserve the right to remove content and suspend accounts that violate this policy.",
    "legal.terms.ownership.title": "Content Ownership and License",
    "legal.terms.ownership.yourContentTitle": "Your Content",
    "legal.terms.ownership.yourContentBody":
      "You retain ownership of all content you create using ModernNovel. By using the Service, you grant us a limited license to store, process, and display your content solely for the purpose of providing the Service.",
    "legal.terms.ownership.ourContentTitle": "Our Content",
    "legal.terms.ownership.ourContentBody":
      "The ModernNovel platform, including its design, features, and underlying technology, is owned by the ModernNovel project and protected by copyright and other intellectual property laws.",
    "legal.terms.ownership.openSourceTitle": "Open Source License",
    "legal.terms.ownership.openSourceBodyPrefix":
      "ModernNovel is released under the AGPL-3.0 license. The source code is available at ",
    "legal.terms.ownership.openSourceBodySuffix": ".",
    "legal.terms.ai.title": "AI Features and Data Processing",
    "legal.terms.ai.p1":
      "ModernNovel uses artificial intelligence to provide writing assistance and suggestions. By using these features, you understand that:",
    "legal.terms.ai.items.auto":
      "AI suggestions are generated automatically and may not always be accurate",
    "legal.terms.ai.items.responsible":
      "You are responsible for reviewing and validating all AI-generated content",
    "legal.terms.ai.items.processed":
      "Your content may be processed to provide AI assistance features",
    "legal.terms.ai.items.noGuarantee":
      "We do not guarantee the accuracy or quality of AI suggestions",
    "legal.terms.ai.p2":
      "All AI processing is performed securely and in accordance with our Privacy Policy.",
    "legal.terms.availability.title": "Service Availability",
    "legal.terms.availability.p1":
      "We strive to maintain high availability of the Service, but we cannot guarantee uninterrupted access. The Service may be temporarily unavailable due to:",
    "legal.terms.availability.items.maintenance": "Scheduled maintenance and updates",
    "legal.terms.availability.items.technical": "Technical difficulties or system failures",
    "legal.terms.availability.items.thirdParty": "Third-party service interruptions",
    "legal.terms.availability.items.forceMajeure": "Force majeure events",
    "legal.terms.availability.p2":
      "We will make reasonable efforts to provide notice of planned downtime when possible.",
    "legal.terms.disclaimer.title": "Disclaimer of Warranties",
    "legal.terms.disclaimer.p1": `THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.`,
    "legal.terms.disclaimer.p2":
      "We do not warrant that the Service will be error-free, secure, or continuously available.",
    "legal.terms.liability.title": "Limitation of Liability",
    "legal.terms.liability.p1":
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, PROFITS, OR BUSINESS INTERRUPTION.",
    "legal.terms.liability.p2":
      "Our total liability to you for all claims related to the Service shall not exceed the amount you paid us in the twelve months preceding the claim.",
    "legal.terms.termination.title": "Termination",
    "legal.terms.termination.p1":
      "You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination:",
    "legal.terms.termination.items.revoked":
      "Your access to the Service will be immediately revoked",
    "legal.terms.termination.items.deleted": "Your content may be deleted from our servers",
    "legal.terms.termination.items.retained":
      "We may retain certain information as required by law",
    "legal.terms.termination.p2":
      "We may terminate or suspend your account if you violate these Terms or for any other reason at our sole discretion.",
    "legal.terms.law.title": "Governing Law and Disputes",
    "legal.terms.law.p1":
      "These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where the ModernNovel project is based, without regard to conflict of law principles.",
    "legal.terms.law.p2":
      "Any disputes arising from these Terms or your use of the Service should first be addressed through our GitHub issues or direct communication. We encourage good faith efforts to resolve disputes amicably.",
    "legal.terms.changes.title": "Changes to These Terms",
    "legal.terms.changes.p1": `We may update these Terms from time to time. We will notify users of any significant changes by posting the new Terms on this page and updating the "Last updated" date.`,
    "legal.terms.changes.p2":
      "Your continued use of the Service after any changes indicates your acceptance of the updated Terms. If you do not agree to the changes, you should discontinue using the Service.",
    "legal.terms.contact.title": "Contact Us",
    "legal.terms.contact.intro":
      "If you have any questions about these Terms of Service, please contact us:",
    "legal.terms.contact.githubIssues": "GitHub Issues:",
    "legal.terms.contact.email": "Email:",
    "legal.terms.contact.p2":
      "As an open-source project, we welcome community feedback and contributions to improve these Terms and the ModernNovel platform.",
  },
  "zh-CN": {
    "legal.privacy.backToHome": "返回首页",
    "legal.privacy.title": "隐私政策",
    "legal.privacy.lastUpdated": "最近更新：",
    "legal.privacy.introduction.title": "简介",
    "legal.privacy.introduction.body":
      "ModernNovel（“我们”）致力于保护您的隐私。本隐私政策说明当您使用我们的 AI 驱动写作平台时，我们如何收集、使用、披露和保护您的信息。",
    "legal.privacy.collect.title": "我们收集的信息",
    "legal.privacy.collect.personalTitle": "个人信息",
    "legal.privacy.collect.personal.email": "电子邮箱地址（用于账户创建和身份验证）",
    "legal.privacy.collect.personal.name": "姓名（可选，用于个性化）",
    "legal.privacy.collect.personal.content": "您创建的写作内容和文档",
    "legal.privacy.collect.autoTitle": "自动收集的信息",
    "legal.privacy.collect.auto.usage": "使用数据和分析信息",
    "legal.privacy.collect.auto.device": "设备和浏览器信息",
    "legal.privacy.collect.auto.ip": "IP 地址和位置信息",
    "legal.privacy.collect.auto.cookies": "Cookie 及类似跟踪技术",
    "legal.privacy.use.title": "我们如何使用您的信息",
    "legal.privacy.use.intro": "我们将收集的信息用于：",
    "legal.privacy.use.items.platform": "提供并维护我们的写作平台",
    "legal.privacy.use.items.auth": "验证您的账户并保障安全",
    "legal.privacy.use.items.sync": "在不同设备之间保存并同步您的写作内容",
    "legal.privacy.use.items.ai": "改进我们的 AI 辅助功能",
    "legal.privacy.use.items.analytics": "分析使用模式以提升用户体验",
    "legal.privacy.use.items.communicate": "就更新和功能与您沟通",
    "legal.privacy.security.title": "数据存储与安全",
    "legal.privacy.security.p1":
      "您的数据会通过行业标准加密方式进行安全存储。我们使用 Cloudflare D1 进行数据存储，其提供企业级安全性与合规支持。您的写作内容在传输和静态存储过程中都会被加密。",
    "legal.privacy.security.p2":
      "我们采取适当的技术和组织措施，保护您的个人信息免遭未经授权的访问、更改、披露或销毁。",
    "legal.privacy.sharing.title": "数据共享与披露",
    "legal.privacy.sharing.p1":
      "我们不会向第三方出售、交易或以其他方式转让您的个人信息，但以下情形除外：",
    "legal.privacy.sharing.items.consent": "经您明确同意",
    "legal.privacy.sharing.items.legal": "为遵守法律义务",
    "legal.privacy.sharing.items.rights": "为保护我们的权利与安全",
    "legal.privacy.sharing.items.transfer": "与业务转让或合并相关时",
    "legal.privacy.sharing.p2":
      "我们可能会出于研究和分析目的使用匿名化和汇总后的数据，此类数据无法用于识别特定个人用户。",
    "legal.privacy.rights.title": "您的权利",
    "legal.privacy.rights.intro": "您有权：",
    "legal.privacy.rights.items.access": "访问您的个人数据",
    "legal.privacy.rights.items.correct": "更正不准确的信息",
    "legal.privacy.rights.items.delete": "删除您的账户及相关数据",
    "legal.privacy.rights.items.export": "导出您的写作内容",
    "legal.privacy.rights.items.marketing": "选择不接收营销沟通",
    "legal.privacy.rights.items.withdraw": "在适用情况下撤回同意",
    "legal.privacy.rights.p2": "如需行使上述权利，请使用下方“联系我们”部分提供的信息与我们联系。",
    "legal.privacy.cookies.title": "Cookie 与跟踪技术",
    "legal.privacy.cookies.p1":
      "我们使用 Cookie 和类似技术来提升您的体验、记住您的偏好并分析使用模式。您可以通过浏览器设置控制 Cookie 偏好。",
    "legal.privacy.cookies.p2":
      "必要 Cookie 是平台正常运行所必需的，无法禁用。可选 Cookie 可帮助我们改进服务，您可随时将其禁用。",
    "legal.privacy.openSource.title": "开源承诺",
    "legal.privacy.openSource.p1":
      "ModernNovel 是一个依据 AGPL-3.0 许可发布的开源项目。我们的源代码在 GitHub 上公开可用，以便社区透明审查我们的隐私与安全实践。",
    "legal.privacy.openSource.p2Prefix":
      "您可以通过查阅以下地址的源代码，了解我们的数据处理实践、安全实现和隐私保护措施：",
    "legal.privacy.openSource.p2Suffix": "。",
    "legal.privacy.changes.title": "本隐私政策的变更",
    "legal.privacy.changes.p1":
      "我们可能会不时更新本隐私政策。如有任何重大变更，我们将通过在本页面发布新的隐私政策并更新“最近更新”日期的方式通知您。",
    "legal.privacy.changes.p2":
      "在相关变更生效后，您继续使用 ModernNovel 即表示您接受更新后的隐私政策。",
    "legal.privacy.contact.title": "联系我们",
    "legal.privacy.contact.intro":
      "如果您对本隐私政策或我们的隐私实践有任何疑问，请通过以下方式联系我们：",
    "legal.privacy.contact.githubIssues": "GitHub Issues：",
    "legal.privacy.contact.email": "电子邮箱：",
    "legal.terms.backToHome": "返回首页",
    "legal.terms.title": "服务条款",
    "legal.terms.lastUpdated": "最近更新：",
    "legal.terms.introduction.title": "简介",
    "legal.terms.introduction.p1":
      "欢迎使用 ModernNovel。本服务条款（“条款”）适用于您对由 ModernNovel 项目（“我们”）运营的 ModernNovel 平台（“服务”）的使用。",
    "legal.terms.introduction.p2":
      "访问或使用我们的服务，即表示您同意受本条款约束。如果您不同意本条款的任何部分，则不得访问本服务。",
    "legal.terms.acceptance.title": "条款接受",
    "legal.terms.acceptance.p1":
      "通过创建账户或使用 ModernNovel，您确认您已阅读、理解并同意受本条款及我们的隐私政策约束。",
    "legal.terms.acceptance.p2":
      "您必须年满 13 周岁方可使用本服务。如果您未满 18 周岁，则表示您已获得父母或监护人许可使用本服务。",
    "legal.terms.service.title": "服务说明",
    "legal.terms.service.intro": "ModernNovel 是一个 AI 驱动的写作平台，提供：",
    "legal.terms.service.items.richText": "具备实时协作能力的富文本编辑功能",
    "legal.terms.service.items.ai": "AI 辅助写作建议与改进",
    "legal.terms.service.items.storage": "文档存储与同步",
    "legal.terms.service.items.export": "导出与分享功能",
    "legal.terms.service.items.analytics": "写作分析与洞察",
    "legal.terms.service.p2":
      "本服务按“现状”提供，我们可在任何时候对其进行修改、更新或停止提供，恕不另行通知。",
    "legal.terms.accounts.title": "用户账户",
    "legal.terms.accounts.intro": "要访问服务的某些功能，您必须创建账户。您有责任：",
    "legal.terms.accounts.items.credentials": "维护您账户凭证的保密性",
    "legal.terms.accounts.items.activities": "对在您账户下发生的所有活动负责",
    "legal.terms.accounts.items.accurate": "提供准确且最新的信息",
    "legal.terms.accounts.items.notify": "发现任何未经授权的使用时立即通知我们",
    "legal.terms.accounts.p2": "对于违反本条款或长期不活跃的账户，我们保留终止其账户的权利。",
    "legal.terms.acceptable.title": "可接受使用政策",
    "legal.terms.acceptable.intro": "您同意不将本服务用于：",
    "legal.terms.acceptable.items.laws": "违反任何适用法律或法规",
    "legal.terms.acceptable.items.ip": "侵犯知识产权",
    "legal.terms.acceptable.items.harmful": "上传有害、冒犯性或不当内容",
    "legal.terms.acceptable.items.access": "试图未经授权访问我们的系统",
    "legal.terms.acceptable.items.malware": "传播恶意软件或从事恶意活动",
    "legal.terms.acceptable.items.spam": "向其他用户发送垃圾信息、骚扰或实施滥用行为",
    "legal.terms.acceptable.items.commercial": "未经许可将本服务用于商业目的",
    "legal.terms.acceptable.p2": "对于违反本政策的内容和账户，我们保留删除内容并暂停账户的权利。",
    "legal.terms.ownership.title": "内容所有权与许可",
    "legal.terms.ownership.yourContentTitle": "您的内容",
    "legal.terms.ownership.yourContentBody":
      "您保留使用 ModernNovel 创建的所有内容的所有权。使用本服务即表示您授予我们一项有限许可，仅为提供本服务之目的存储、处理和展示您的内容。",
    "legal.terms.ownership.ourContentTitle": "我们的内容",
    "legal.terms.ownership.ourContentBody":
      "ModernNovel 平台及其设计、功能和底层技术归 ModernNovel 项目所有，并受版权及其他知识产权法律保护。",
    "legal.terms.ownership.openSourceTitle": "开源许可证",
    "legal.terms.ownership.openSourceBodyPrefix":
      "ModernNovel 基于 AGPL-3.0 许可证发布。源代码可在以下地址获取：",
    "legal.terms.ownership.openSourceBodySuffix": "。",
    "legal.terms.ai.title": "AI 功能与数据处理",
    "legal.terms.ai.p1": "ModernNovel 使用人工智能提供写作辅助和建议。使用这些功能即表示您理解：",
    "legal.terms.ai.items.auto": "AI 建议由系统自动生成，可能并非始终准确",
    "legal.terms.ai.items.responsible": "您有责任审阅并核实所有 AI 生成内容",
    "legal.terms.ai.items.processed": "为提供 AI 辅助功能，您的内容可能会被处理",
    "legal.terms.ai.items.noGuarantee": "我们不保证 AI 建议的准确性或质量",
    "legal.terms.ai.p2": "所有 AI 处理均以安全方式进行，并遵循我们的隐私政策。",
    "legal.terms.availability.title": "服务可用性",
    "legal.terms.availability.p1":
      "我们努力维持服务的高可用性，但无法保证不间断访问。服务可能因以下原因暂时不可用：",
    "legal.terms.availability.items.maintenance": "计划内维护与更新",
    "legal.terms.availability.items.technical": "技术问题或系统故障",
    "legal.terms.availability.items.thirdParty": "第三方服务中断",
    "legal.terms.availability.items.forceMajeure": "不可抗力事件",
    "legal.terms.availability.p2": "在可能的情况下，我们将尽合理努力就计划中的停机提前发出通知。",
    "legal.terms.disclaimer.title": "免责声明",
    "legal.terms.disclaimer.p1":
      "本服务按“现状”和“可用”基础提供，不附带任何形式的明示或默示保证，包括但不限于适销性、特定用途适用性及不侵权保证。",
    "legal.terms.disclaimer.p2": "我们不保证本服务不会出错、绝对安全或持续可用。",
    "legal.terms.liability.title": "责任限制",
    "legal.terms.liability.p1":
      "在法律允许的最大范围内，对于任何间接性、附带性、特殊性、后果性或惩罚性损害（包括但不限于数据丢失、利润损失或业务中断），我们概不承担责任。",
    "legal.terms.liability.p2":
      "对于与本服务相关的所有索赔，我们对您承担的责任总额不超过您在提出索赔前十二个月内向我们支付的金额。",
    "legal.terms.termination.title": "终止",
    "legal.terms.termination.p1": "您可随时通过联系我们或使用账户删除功能终止您的账户。终止后：",
    "legal.terms.termination.items.revoked": "您对本服务的访问权限将被立即撤销",
    "legal.terms.termination.items.deleted": "您的内容可能会从我们的服务器中删除",
    "legal.terms.termination.items.retained": "我们可能会按照法律要求保留某些信息",
    "legal.terms.termination.p2":
      "如果您违反本条款，或基于我们自行决定的任何其他原因，我们可终止或暂停您的账户。",
    "legal.terms.law.title": "适用法律与争议",
    "legal.terms.law.p1":
      "本条款应受 ModernNovel 项目所在地司法管辖区法律管辖并据其解释，但不适用其法律冲突原则。",
    "legal.terms.law.p2":
      "因本条款或您使用本服务引起的任何争议，应首先通过我们的 GitHub issues 或直接沟通方式提出。我们鼓励各方以诚信原则友好解决争议。",
    "legal.terms.changes.title": "本条款的变更",
    "legal.terms.changes.p1":
      "我们可能会不时更新本条款。如有任何重大变更，我们将通过在本页面发布新条款并更新“最近更新”日期的方式通知用户。",
    "legal.terms.changes.p2":
      "在相关变更生效后，您继续使用本服务即表示您接受更新后的条款。如果您不同意相关变更，您应停止使用本服务。",
    "legal.terms.contact.title": "联系我们",
    "legal.terms.contact.intro": "如果您对本服务条款有任何疑问，请通过以下方式联系我们：",
    "legal.terms.contact.githubIssues": "GitHub Issues：",
    "legal.terms.contact.email": "电子邮箱：",
    "legal.terms.contact.p2":
      "作为一个开源项目，我们欢迎社区反馈与贡献，以帮助改进本条款和 ModernNovel 平台。",
  },
}

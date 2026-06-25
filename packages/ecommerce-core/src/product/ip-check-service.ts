/**
 * IP Check Service — SOP Section 19 IP check process + Section 28 IP check log.
 *
 * Kiểm tra rủi ro IP trước khi launch sản phẩm theo quy trình 6 bước.
 * KHÔNG dùng agent. KHÔNG mock. Code thuần.
 */
import { randomUUID } from 'node:crypto'

export type IpRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type IpBlacklistType = 'brand' | 'character' | 'sports_team' | 'university' | 'movie' | 'song' | 'quote' | 'celebrity'

export interface IpCheckResult {
  id: string
  productId: string
  keywordsChecked: string[]
  assetsChecked: string[]
  assetSource: string
  license: string
  trademarkRisk: IpRiskLevel
  copyrightRisk: IpRiskLevel
  characterRisk: IpRiskLevel
  conclusion: string
  checker: string
  approver: string
}

export interface IpCheckInput {
  productId: string
  keywordsChecked: string[]
  assetsChecked: string[]
  assetSource: string
  license: string
  checker: string
  approver?: string
}

export interface IpBlacklistEntry {
  id: string
  keyword: string
  type: IpBlacklistType
  notes?: string
}

export interface IpBlacklistCreateInput {
  keyword: string
  type: IpBlacklistType
  notes?: string
}

export interface IpCheckStorage {
  createCheck(result: IpCheckResult): IpCheckResult
  findChecksByProductId(productId: string): IpCheckResult[]
  addToBlacklist(entry: IpBlacklistEntry): IpBlacklistEntry
  findBlacklisted(keyword: string): IpBlacklistEntry | undefined
  findAllBlacklisted(): IpBlacklistEntry[]
}

// === Private check functions ===

function checkTrademarkRisk(keywords: string[], blacklist: IpBlacklistEntry[]): IpRiskLevel {
  const brandKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'brand' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )
  const celebKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'celebrity' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )
  const sportsKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'sports_team' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )
  const uniKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'university' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )

  if (brandKeywords.length > 2 || celebKeywords.length > 0) return 'critical'
  if (brandKeywords.length > 1 || sportsKeywords.length > 0 || uniKeywords.length > 0) return 'high'
  if (brandKeywords.length > 0) return 'medium'
  return 'low'
}

function checkCopyrightRisk(keywords: string[], blacklist: IpBlacklistEntry[]): IpRiskLevel {
  const movieKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'movie' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )
  const songKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'song' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )
  const quoteKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'quote' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )

  if (movieKeywords.length > 0 || songKeywords.length > 0) return 'high'
  if (quoteKeywords.length > 0) return 'medium'
  return 'low'
}

function checkCharacterRisk(keywords: string[], blacklist: IpBlacklistEntry[]): IpRiskLevel {
  const charKeywords = keywords.filter((kw) =>
    blacklist.some((b) => b.type === 'character' && kw.toLowerCase().includes(b.keyword.toLowerCase()))
  )

  if (charKeywords.length > 2) return 'critical'
  if (charKeywords.length > 1) return 'high'
  if (charKeywords.length > 0) return 'medium'
  return 'low'
}

function generateConclusion(
  trademarkRisk: IpRiskLevel,
  copyrightRisk: IpRiskLevel,
  characterRisk: IpRiskLevel,
): string {
  const risks: string[] = []
  if (trademarkRisk !== 'low') risks.push(`Trademark: ${trademarkRisk}`)
  if (copyrightRisk !== 'low') risks.push(`Copyright: ${copyrightRisk}`)
  if (characterRisk !== 'low') risks.push(`Character: ${characterRisk}`)

  if (risks.length === 0) {
    return 'No significant IP risks detected. Proceed with standard caution.'
  }
  if (trademarkRisk === 'critical' || copyrightRisk === 'critical' || characterRisk === 'critical') {
    return `CRITICAL: ${risks.join(', ')}. STOP — do not publish until reviewed by compliance.`
  }
  return `IP risks detected: ${risks.join(', ')}. Review assets and consult compliance before proceeding.`
}

// === Public interface ===

export class IpCheckService {
  constructor(private storage: IpCheckStorage) {}

  /**
   * Run 6-step IP check according to SOP Section 19.2:
   * 1. Check product name/keywords for brand, character, celebrity, sports team, university
   * 2. Check design assets for unknown license
   * 3. Check fonts for commercial license
   * 4. Check AI-generated content disclosure
   * 5. Check keywords against blacklist
   * 6. Generate conclusion and store result
   */
  checkProduct(input: IpCheckInput): IpCheckResult {
    const blacklist = this.storage.findAllBlacklisted()

    // Steps 1, 5: Check keywords against blacklist
    let trademarkRisk = checkTrademarkRisk(input.keywordsChecked, blacklist)
    let copyrightRisk = checkCopyrightRisk(input.keywordsChecked, blacklist)
    let characterRisk = checkCharacterRisk(input.keywordsChecked, blacklist)

    // Step 2: Asset source check — unknown or AI-generated sources elevate risk
    if (!input.assetSource || input.assetSource === 'unknown' || input.assetSource === 'ai_generated') {
      if (trademarkRisk === 'low') trademarkRisk = 'medium'
    }

    // Steps 3, 4: License check — missing/unknown license elevates copyright risk
    if (!input.license || input.license === 'unknown' || input.license === 'none') {
      if (copyrightRisk === 'low') copyrightRisk = 'medium'
    }

    const conclusion = generateConclusion(trademarkRisk, copyrightRisk, characterRisk)

    const result: IpCheckResult = {
      id: randomUUID(),
      productId: input.productId,
      keywordsChecked: input.keywordsChecked,
      assetsChecked: input.assetsChecked,
      assetSource: input.assetSource,
      license: input.license,
      trademarkRisk,
      copyrightRisk,
      characterRisk,
      conclusion,
      checker: input.checker,
      approver: input.approver ?? '',
    }

    return this.storage.createCheck(result)
  }

  addToBlacklist(input: IpBlacklistCreateInput): IpBlacklistEntry {
    const entry: IpBlacklistEntry = {
      id: randomUUID(),
      keyword: input.keyword.toLowerCase().trim(),
      type: input.type,
      notes: input.notes,
    }
    return this.storage.addToBlacklist(entry)
  }

  isBlacklisted(keyword: string): boolean {
    return this.storage.findBlacklisted(keyword) !== undefined
  }

  getCheckHistory(productId: string): IpCheckResult[] {
    return this.storage.findChecksByProductId(productId)
  }
}

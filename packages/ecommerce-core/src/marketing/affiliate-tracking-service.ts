export type CommissionType = 'percentage' | 'fixed_amount';

export interface Affiliate {
  id: string;
  name: string;
  commissionType: CommissionType;
  commissionRate: number;
  status: 'active' | 'suspended';
  trackingCodes: string[];
}

export interface AffiliateClick {
  clickId: string;
  affiliateId: string;
  trackingCode: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  converted: boolean;
}

export interface AffiliateConversion {
  conversionId: string;
  affiliateId: string;
  clickId: string;
  orderId: string;
  orderValue: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  timestamp: Date;
}

export interface IAffiliateStorage {
  getAffiliateByTrackingCode(code: string): Promise<Affiliate | null>;
  logClick(click: Omit<AffiliateClick, 'converted'>): Promise<string>;
  getClick(clickId: string): Promise<AffiliateClick | null>;
  markClickConverted(clickId: string): Promise<void>;
  recordConversion(conversion: AffiliateConversion): Promise<void>;
  updateConversionStatus(conversionId: string, status: AffiliateConversion['status']): Promise<void>;
}

export class AffiliateTrackingService {
  constructor(private readonly storage: IAffiliateStorage) {}

  public async trackClick(
    trackingCode: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<{ clickId: string; affiliateId: string } | null> {
    const affiliate = await this.storage.getAffiliateByTrackingCode(trackingCode);
    
    if (!affiliate || affiliate.status !== 'active') {
      return null;
    }

    const clickId = `click_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await this.storage.logClick({
      clickId,
      affiliateId: affiliate.id,
      trackingCode,
      timestamp: new Date(),
      ipAddress,
      userAgent
    });

    return {
      clickId,
      affiliateId: affiliate.id
    };
  }

  public async registerConversion(
    clickId: string, 
    orderId: string, 
    orderValue: number
  ): Promise<AffiliateConversion | null> {
    const click = await this.storage.getClick(clickId);
    
    if (!click || click.converted) {
      return null;
    }

    const affiliate = await this.storage.getAffiliateByTrackingCode(click.trackingCode);
    
    if (!affiliate || affiliate.status !== 'active') {
      return null;
    }

    const commissionAmount = affiliate.commissionType === 'percentage' 
      ? orderValue * (affiliate.commissionRate / 100)
      : affiliate.commissionRate;

    const conversion: AffiliateConversion = {
      conversionId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      affiliateId: affiliate.id,
      clickId: click.clickId,
      orderId,
      orderValue,
      commissionAmount,
      status: 'pending',
      timestamp: new Date()
    };

    await this.storage.recordConversion(conversion);
    await this.storage.markClickConverted(clickId);

    return conversion;
  }

  public async adjudicateConversion(
    conversionId: string, 
    status: 'approved' | 'rejected'
  ): Promise<void> {
    await this.storage.updateConversionStatus(conversionId, status);
  }
}

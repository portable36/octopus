import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  COMPLETED_ORDER_BASKETS_PORT,
  type CompletedOrderBasketsPort,
} from '../ports/completed-order-baskets.port';
import {
  PRODUCT_ASSOCIATION_REPOSITORY,
  type ProductAssociationRepository,
} from '../ports/product-association-repository.interface';
import { CoPurchaseAnalyzerService } from './co-purchase-analyzer.service';

const ANALYSIS_LOOKBACK_DAYS = 90;
const MAX_ORDERS_PER_RUN = 10_000;

@Injectable()
export class PurchasePatternAnalysisService {
  private readonly logger = new Logger(PurchasePatternAnalysisService.name);

  constructor(
    @Inject(COMPLETED_ORDER_BASKETS_PORT)
    private readonly orderBaskets: CompletedOrderBasketsPort,
    @Inject(PRODUCT_ASSOCIATION_REPOSITORY)
    private readonly associations: ProductAssociationRepository,
    private readonly analyzer: CoPurchaseAnalyzerService,
  ) {}

  public async analyzeAndPersist(): Promise<{ readonly associationsWritten: number }> {
    const since = new Date(Date.now() - ANALYSIS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const baskets = await this.orderBaskets.listRecentBaskets({
      since,
      limit: MAX_ORDERS_PER_RUN,
    });

    const computed = this.analyzer.computeAssociations(baskets);
    await this.associations.replaceAll(computed);

    this.logger.log(
      `Purchase pattern analysis complete: ${baskets.length} orders → ${computed.length} associations.`,
    );

    return { associationsWritten: computed.length };
  }
}

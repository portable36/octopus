import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { CustomerHandlers } from '../../application/commands/customer.handlers';

@ApiTags('public-reviews')
@Controller('products')
export class PublicProductReviewsController {
  constructor(private readonly customers: CustomerHandlers) {}

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({ summary: 'List published product reviews' })
  async listReviews(@Param('productId') productId: string) {
    const [reviews, summary] = await Promise.all([
      this.customers.listPublishedReviews(productId),
      this.customers.getReviewSummary(productId),
    ]);
    return {
      summary,
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        rating: review.rating,
        title: review.title,
        body: review.body,
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }

  @Public()
  @Get(':productId/reviews/summary')
  @ApiOperation({ summary: 'Get product review rating summary' })
  async summary(@Param('productId') productId: string) {
    return this.customers.getReviewSummary(productId);
  }
}

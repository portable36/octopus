import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { AiRecommendationService } from '../../application/services/ai-recommendation.service';

class RecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number;
}

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: AiRecommendationService) {}

  @Public()
  @Get('products/:id')
  @ApiOperation({ summary: 'Frequently bought together (pre-computed co-purchase scores)' })
  public async getProductRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecommendationsQueryDto,
  ) {
    const items = await this.recommendations.getFrequentlyBoughtTogether(id, query.limit ?? 8);
    return {
      productId: id,
      recommendations: items,
    };
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Public } from '../../../../shared-kernel/presentation/http/public.decorator';
import { SeoPageResolveService } from '../../application/services/seo-page-resolve.service';

class ResolveSeoQueryDto {
  @IsString()
  @MinLength(1)
  path!: string;
}

@ApiTags('public-seo')
@Controller('public/seo')
export class PublicSeoController {
  constructor(private readonly resolver: SeoPageResolveService) {}

  @Public()
  @Get('resolve')
  @ApiOperation({ summary: 'Resolve storefront SEO metadata and JSON-LD for a public path' })
  resolve(@Query() query: ResolveSeoQueryDto) {
    return this.resolver.resolveByPath(query.path);
  }
}

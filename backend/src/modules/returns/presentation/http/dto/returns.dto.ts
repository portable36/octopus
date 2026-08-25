import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RequestReturnItemDto {
  @IsUUID()
  orderItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MaxLength(64)
  reasonCode!: string;
}

export class RequestReturnDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequestReturnItemDto)
  items!: RequestReturnItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class RejectReturnDto {
  @IsString()
  @MaxLength(64)
  reasonCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class InspectReturnDto {
  @IsInt()
  @Min(0)
  quantityReceived!: number;

  @IsInt()
  @Min(0)
  quantityAccepted!: number;

  @IsInt()
  @Min(0)
  quantityRejected!: number;

  @IsIn(['NEW', 'LIKE_NEW', 'USED', 'DAMAGED', 'DEFECTIVE', 'UNSELLABLE', 'UNKNOWN'])
  condition!: 'NEW' | 'LIKE_NEW' | 'USED' | 'DAMAGED' | 'DEFECTIVE' | 'UNSELLABLE' | 'UNKNOWN';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

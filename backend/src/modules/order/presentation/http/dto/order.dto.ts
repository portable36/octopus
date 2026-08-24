import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FulfillOrderLineDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;
}

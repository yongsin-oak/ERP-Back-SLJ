import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Column } from 'typeorm';

export class Dimensions {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('float', { nullable: true })
  length: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('float', { nullable: true })
  width: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('float', { nullable: true })
  height: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('float', { nullable: true })
  weight: number;
}

export class ProductUnitPrice {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('int', { nullable: true })
  pack: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Column('int', { nullable: true })
  carton: number;
}

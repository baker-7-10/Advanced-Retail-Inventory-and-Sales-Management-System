import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// All fields optional for PATCH requests
export class UpdateProductDto extends PartialType(CreateProductDto) {}

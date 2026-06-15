import { IsArray, IsInt } from 'class-validator';

export class AssignMenusDto {
  @IsArray()
  @IsInt({ each: true })
  menuIds: number[];
}

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { MenuNodeDto } from './dto/menu-node.dto';
import { MenuInfoDto } from './dto/menu-info.dto';
import { API_PATH, PERM } from '../constant';
import { Permissions } from '../common/decorators/permissions.decorator';
import {
  ApiResponseWrapper,
  ApiArrayResponse,
  ApiMessageResponse,
  ApiCommonErrorResponses,
} from '../common/swagger';

/** 菜单管理控制器 — 提供菜单树的增删改查 */
@ApiTags('api/menu')
@ApiCommonErrorResponses()
@Controller('api/menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  /** GET /api/menu/getMenuTree — 获取完整菜单树 */
  @ApiOperation({ summary: '获取菜单树' })
  @ApiArrayResponse(MenuNodeDto)
  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.TREE)
  getMenuTree() {
    return this.menuService.getMenuTree();
  }

  /** GET /api/menu/getMenuById — 按 ID 查询单个菜单 */
  @ApiOperation({ summary: '获取菜单详情' })
  @ApiQuery({ name: 'id', type: Number, required: true, example: 1, description: '菜单ID' })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.LIST)
  @Get(API_PATH.MENU.BY_ID)
  getMenuById(@Query('id') id: string) {
    return this.menuService.getMenuById(Number(id));
  }

  /** POST /api/menu/addMenu — 创建新菜单节点 */
  @ApiOperation({ summary: '新增菜单' })
  @ApiBody({ type: CreateMenuDto })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.ADD)
  @Post(API_PATH.MENU.ADD)
  addMenu(@Body() dto: CreateMenuDto) {
    return this.menuService.addMenu(dto);
  }

  /** POST /api/menu/updateMenu — 更新菜单，id 必填其余字段可选 */
  @ApiOperation({ summary: '更新菜单' })
  @ApiExtraModels(UpdateMenuDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(UpdateMenuDto) },
        {
          type: 'object',
          properties: { id: { type: 'number', description: '菜单ID', example: 1 } },
          required: ['id'],
        },
      ],
    },
  })
  @ApiResponseWrapper(MenuInfoDto)
  @Permissions(PERM.MENU.UPDATE)
  @Post(API_PATH.MENU.UPDATE)
  updateMenu(@Body() dto: UpdateMenuDto & { id: number }) {
    return this.menuService.updateMenu(dto);
  }

  /** POST /api/menu/delMenu — 删除菜单 */
  @ApiOperation({ summary: '删除菜单' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { id: { type: 'number', description: '菜单ID', example: 1 } },
      required: ['id'],
    },
  })
  @ApiMessageResponse()
  @Permissions(PERM.MENU.DELETE)
  @Post(API_PATH.MENU.DELETE)
  delMenu(@Body('id') id: number) {
    return this.menuService.delMenu(Number(id));
  }
}

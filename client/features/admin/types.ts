import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
  OrderListSummary,
} from "@/features/orders/api/types";

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreatorLanguageResponseDto {
  id: string;
  language: string;
}

export interface CreatorCategoryResponseDto {
  id: string;
  category: string;
}

export interface CreatorPersonaTagResponseDto {
  id: string;
  tag: string;
}

export interface CreatorRestrictionResponseDto {
  id: string;
  restriction: string;
}

export interface CreatorPackageResponseDto {
  id: string;
  name: string;
  deliverables: string[];
  priceAmount: string;
  deliveryDays: number;
}

export interface CreatorAddOnResponseDto {
  id: string;
  name: string;
  priceAmount: string;
  description?: string | null;
}

export interface CreatorPortfolioVideoPreviewResponseDto {
  id: string;
  creatorId: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  industryLabel?: string | null;
  tags: string[];
  createdAt: string;
}

export interface CreatorProfileResponseDto {
  id: string;
  userId: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  travelRadius?: number | null;
  onLocationAvailable: boolean;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string | null;
  languages: CreatorLanguageResponseDto[];
  categories: CreatorCategoryResponseDto[];
  personaTags: CreatorPersonaTagResponseDto[];
  restrictions: CreatorRestrictionResponseDto[];
  packages: CreatorPackageResponseDto[];
  addOns: CreatorAddOnResponseDto[];
  firstPortfolioVideo?: CreatorPortfolioVideoPreviewResponseDto | null;
  createdAt?: string;
}

export interface CreatorsListResponseDto {
  items: CreatorProfileResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingApprovalsQueryDto {
  page?: number;
  limit?: number;
}

export interface AdminBrandsQueryDto {
  page?: number;
  limit?: number;
}

export interface AdminBrandListItemDto {
  userId: string;
  brandProfileId: string | null;
  email: string;
  name: string | null;
  companyName: string | null;
  industry: string | null;
  contactPerson: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBrandsListResponseDto {
  items: AdminBrandListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminOrdersQueryDto {
  page?: number;
  limit?: number;
}

export interface AdminOrderListItemDto {
  order: OrderListSummary;
  creator: OrderCreatorSnapshot;
  brand: OrderBrandSnapshot;
}

export interface AdminOrdersListResponseDto {
  items: AdminOrderListItemDto[];
  total: number;
  page: number;
  limit: number;
}

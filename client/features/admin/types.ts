import type {
  OrderBrandSnapshot,
  OrderCreatorSnapshot,
  OrderDetailsPublic,
  OrderListSummary,
} from "@/features/orders/api/types";
import type { BrandCategoryApi } from "@/features/brands/api/brand-category-types";

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CreatorLanguageFluency = "NATIVE" | "FLUENT" | "CONVERSATIONAL";

export type CreatorFacetDimension =
  | "CONTENT_FORMAT"
  | "APPEARANCE"
  | "CONTENT_STYLE"
  | "CAPABILITY"
  | "LIFE_STYLE"
  | "OCCUPATION"
  | "CONTENT_CATEGORY"
  | "CATEGORY_EXPERIENCE"
  | "CAN_CREATE_WITH"
  | "AI_CONTENT_PERMISSION"
  | "LANGUAGE";

export interface CreatorProfileLanguageResponseDto {
  id: string;
  slug: string;
  label: string;
  fluency: CreatorLanguageFluency;
}

export interface CreatorFacetSelectionResponseDto {
  id: string;
  dimension: CreatorFacetDimension;
  slug: string;
  label: string;
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
  videoLengthSeconds: number;
  priceAmount: string;
  deliveryDays: number;
  maxRevisions: number;
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

/** Admin pending queue: signup fields only (GET /admin/creators/pending-approvals). */
export interface PendingCreatorContentCategoryDto {
  slug: string;
  label: string;
}

export interface PendingCreatorApprovalListItemDto {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  phoneVerified: boolean;
  contactEmail?: string | null;
  city?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  bio?: string | null;
  gender?: string | null;
  age?: number | null;
  instagramUrl?: string | null;
  driveLink?: string | null;
  contentCategories: PendingCreatorContentCategoryDto[];
  portfolioVideos: CreatorPortfolioVideoPreviewResponseDto[];
  approvalStatus: ApprovalStatus;
  submittedAt: string;
}

export interface PendingCreatorsListResponseDto {
  items: PendingCreatorApprovalListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CreatorProfileResponseDto {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  phoneVerified?: boolean;
  profileImageUrl?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  city?: string | null;
  bio?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  ageGroup?: string | null;
  shippingAddress?: string | null;
  instagramUrl?: string | null;
  contentVolume?: string | null;
  collaborationCount: number;
  travelRadius?: number | null;
  onLocationAvailable: boolean;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string | null;
  profileLanguages: CreatorProfileLanguageResponseDto[];
  facetSelections: CreatorFacetSelectionResponseDto[];
  personaTags: CreatorPersonaTagResponseDto[];
  restrictions: CreatorRestrictionResponseDto[];
  packages: CreatorPackageResponseDto[];
  addOns: CreatorAddOnResponseDto[];
}

export interface CreatorsListResponseDto {
  items: CreatorProfileResponseDto[];
  total: number;
  page: number;
  limit: number;
}

/** Admin pending-approval queue (signup fields only). */
export interface PendingCreatorContentCategoryDto {
  slug: string;
  label: string;
}

export interface PendingCreatorApprovalListItemDto {
  id: string;
  userId: string;
  displayName: string;
  phone?: string | null;
  phoneVerified: boolean;
  contactEmail?: string | null;
  city?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  bio?: string | null;
  gender?: string | null;
  age?: number | null;
  instagramUrl?: string | null;
  contentCategories: PendingCreatorContentCategoryDto[];
  portfolioVideos: CreatorPortfolioVideoPreviewResponseDto[];
  approvalStatus: ApprovalStatus;
  submittedAt: string;
}

export interface PendingCreatorsListResponseDto {
  items: PendingCreatorApprovalListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface PendingApprovalsQueryDto {
  page?: number;
  limit?: number;
  search?: string;
}

export type AdminCreatorListSegment =
  | "pending"
  | "approved"
  | "non_approved"
  | "incomplete"
  | "listed";

export interface AdminCreatorsListQueryDto extends PendingApprovalsQueryDto {
  segment: AdminCreatorListSegment;
}

export interface AdminCreatorSegmentCountsDto {
  pending: number;
  approved: number;
  nonApproved: number;
  incomplete: number;
  listed: number;
}

export interface BuildingProfileFieldStatDto {
  key: string;
  label: string;
  incompleteCount: number;
  percentage: number;
}

export interface AdminBuildingProfileAnalyticsDto {
  totalProfiles: number;
  fields: BuildingProfileFieldStatDto[];
}

export interface AdminCreatorListItemDto extends PendingCreatorApprovalListItemDto {
  profileImageUrl?: string | null;
  completeProfile: boolean;
  isListed: boolean;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  approvedAt?: string | null;
  avgRating?: string | null;
  reviewCount?: number;
  startingPrice?: string | null;
  onLocationAvailable: boolean;
}

export interface AdminCreatorsListResponseDto {
  items: AdminCreatorListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface RejectedCreatorApprovalListItemDto
  extends PendingCreatorApprovalListItemDto {
  rejectionReason?: string | null;
  rejectedAt?: string | null;
}

export interface RejectedCreatorsListResponseDto {
  items: RejectedCreatorApprovalListItemDto[];
  total: number;
  page: number;
  limit: number;
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
  brandName: string | null;
  contactFullName: string | null;
  contactPhone: string | null;
  categories: BrandCategoryApi[];
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

export interface AdminCreatorPayoutDetailsDto {
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
}

export interface AdminOrderDetailsDto extends OrderDetailsPublic {
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayRefundId?: string | null;
}

export interface AdminOrderDetailsResponseDto {
  order: AdminOrderDetailsDto;
  creator: OrderCreatorSnapshot;
  brand: OrderBrandSnapshot;
}

export interface OrderChatMessageDto {
  id: string;
  orderId: string;
  senderUserId: string;
  type: "TEXT" | "VOICE";
  text?: string | null;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  audioMimeType?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
}

export interface OrderChatMessagesResponseDto {
  items: OrderChatMessageDto[];
  nextCursor?: string;
}

export interface OrderChatStateDto {
  orderId: string;
  brandUserId: string;
  creatorUserId: string;
  brandLastReadMessageId?: string;
  brandLastReadAt?: string;
  creatorLastReadMessageId?: string;
  creatorLastReadAt?: string;
}

export interface AdminOrderChatMessagesQueryDto {
  limit?: number;
  cursor?: string;
}

export interface AdminOrderActionPayload {
  orderId: string;
}

export interface AdminRejectOrderPayload extends AdminOrderActionPayload {
  resolutionNotes?: string;
}

export interface AdminResolveDisputePayload extends AdminOrderActionPayload {
  resolutionNotes?: string;
}

export interface SendAdminOrderChatMessagePayload {
  orderId: string;
  text: string;
  clientMessageId?: string;
}

export interface AdminOrderRefundResponseDto {
  refundId: string;
  refundStatus: string;
}

// ─── Legal Pages ─────────────────────────────────────────────────
export type {
  LegalPageResponse,
  LegalSectionResponse,
  LegalDraftStatus,
  LegalPageDraftResponse,
  DraftSectionData,
  AdminLegalPageListItem,
  AdminLegalPageListResponse,
  AdminLegalPageDetailResponse,
  SaveDraftInput,
  CreateLegalPageInput,
  RejectDraftInput,
  LegalPageVersionListItem,
  LegalPageVersionListResponse,
  LegalPageVersionDetail,
} from "./types/legal-pages";

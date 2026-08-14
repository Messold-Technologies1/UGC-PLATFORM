export type DemoVideoApi = {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDemoVideoInput = {
  videoKey: string;
  thumbnailKey?: string;
  sortOrder?: number;
  active?: boolean;
};

export type UpdateDemoVideoInput = Partial<CreateDemoVideoInput>;

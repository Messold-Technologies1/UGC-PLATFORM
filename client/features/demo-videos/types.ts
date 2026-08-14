export type DemoVideoApi = {
  id: string;
  title: string;
  caption?: string | null;
  videoUrl: string;
  thumbnailUrl?: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateDemoVideoInput = {
  title: string;
  caption?: string;
  videoKey: string;
  thumbnailKey?: string;
  sortOrder?: number;
  active?: boolean;
};

export type UpdateDemoVideoInput = Partial<CreateDemoVideoInput>;

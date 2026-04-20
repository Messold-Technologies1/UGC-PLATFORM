export const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  BRIEF_SUBMISSION_PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  BRIEF_SUBMITTED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELIVERED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  REVISION_REQUESTED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  REVISION_SUBMITTED: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  ACCEPTED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CREATOR_PAYMENT_DONE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  DISPUTED: "bg-red-500/10 text-red-500 border-red-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  BRIEF_SUBMISSION_PENDING: "Brief Required",
  BRIEF_SUBMITTED: "In Progress",
  DELIVERED: "Delivered",
  REVISION_REQUESTED: "Revising",
  REVISION_SUBMITTED: "Revision Delivered",
  ACCEPTED: "Completed",
  CREATOR_PAYMENT_DONE: "Paid Out",
  DISPUTED: "Disputed",
  REJECTED: "Rejected",
};

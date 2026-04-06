import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isWorking?: boolean;
}

export function RejectDialog({ isOpen, onClose, onConfirm, isWorking }: RejectDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="z-100" overlayClassName="z-100">
        <DialogHeader>
          <DialogTitle>Reject Creator</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium text-foreground mb-2 block">Reason:</label>
          <textarea 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Portfolio lighting does not meet platform requirements..."
            maxLength={1000}
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isWorking}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim() || isWorking}>
            {isWorking && <span className="material-symbols-outlined text-[18px] animate-spin mr-2">progress_activity</span>}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

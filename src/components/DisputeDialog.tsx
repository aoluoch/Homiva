import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISPUTE_CATEGORIES } from "@/lib/config";
import { useCreateDispute } from "@/hooks/useDisputes";

interface Props {
  subjectType: string;
  subjectId?: string;
  subjectTitle?: string;
  /** Optional custom trigger; defaults to a small ghost "Report an issue" button. */
  trigger?: React.ReactNode;
}

export function DisputeDialog({
  subjectType,
  subjectId,
  subjectTitle,
  trigger,
}: Props) {
  const create = useCreateDispute();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(DISPUTE_CATEGORIES[0]);
  const [description, setDescription] = useState("");

  const submit = () => {
    create.mutate(
      { subjectType, subjectId, subjectTitle, category, description },
      {
        onSuccess: () => {
          toast.success("Dispute submitted. Our team will review it shortly.");
          setOpen(false);
          setDescription("");
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Flag className="h-4 w-4" /> Report an issue
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
          <DialogDescription>
            {subjectTitle
              ? `Raise a dispute about "${subjectTitle}".`
              : "Tell us what went wrong and our team will investigate."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dispute-desc">Description</Label>
            <Textarea
              id="dispute-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem in detail..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

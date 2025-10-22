import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Project, ProjectFile } from "@shared/schema";
import { Upload, X, File } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  instructions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: projectFiles = [] } = useQuery<ProjectFile[]>({
    queryKey: ["/api/projects", project.id, "files"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${project.id}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project.name,
      instructions: project.instructions || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: project.name,
        instructions: project.instructions || "",
      });
    }
  }, [open, project.id, project.name, project.instructions, form]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest(`/api/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project updated",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "files"] });
      setSelectedFile(null);
      toast({
        title: "Success",
        description: "File uploaded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest(`/api/files/${fileId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "files"] });
      toast({
        title: "Success",
        description: "File deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = () => {
    if (selectedFile) {
      uploadFileMutation.mutate(selectedFile);
    }
  };

  const onSubmit = (data: FormData) => {
    updateProjectMutation.mutate(data);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-wider">
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Configure project details, instructions, and manage files
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold uppercase text-xs tracking-wider">
                    Project Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="border-2 border-border font-mono"
                      data-testid="input-project-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-semibold uppercase text-xs tracking-wider">
                    Project Instructions
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="border-2 border-border font-mono min-h-[150px]"
                      placeholder="Enter instructions for all chats in this project..."
                      data-testid="input-project-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="font-semibold uppercase text-xs tracking-wider">
                Project Files
              </label>
              
              <div className="border-2 border-border p-4">
                {projectFiles.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {projectFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2 hover-elevate border border-border"
                        data-testid={`file-item-${file.id}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-sm font-mono">{file.originalName}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteFileMutation.mutate(file.id)}
                          className="h-6 w-6 flex items-center justify-center hover-elevate"
                          data-testid={`button-delete-file-${file.id}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No files uploaded yet
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:border-2 file:border-border file:bg-card file:text-card-foreground file:font-bold file:uppercase file:tracking-wider file:cursor-pointer hover:file:elevate"
                    data-testid="input-file-upload"
                  />
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploadFileMutation.isPending}
                    className="border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
                    data-testid="button-upload-file"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md"
                style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
                data-testid="button-cancel-project"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProjectMutation.isPending}
                className="border-2 border-border bg-card text-card-foreground px-4 py-2 font-bold uppercase tracking-wider transition-all hover-elevate active-elevate-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: "4px 4px 0px hsl(var(--border))" }}
                data-testid="button-save-project"
              >
                Save Changes
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

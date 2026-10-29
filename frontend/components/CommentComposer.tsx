"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTranslation } from "@/components/LanguageProvider";
import { createComment } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Comment } from "@/lib/types";

export function CommentComposer({
  postId,
  parentId,
  placeholder,
  submitLabel,
  onDone,
}: {
  postId: string;
  parentId?: string;
  placeholder?: string;
  submitLabel?: string;
  onDone?: (comment: Comment) => void;
}) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  async function handleSubmit() {
    const session = getSession();
    if (!session || isEmpty) return;
    setSaving(true);
    setError("");
    try {
      const comment = await createComment(postId, parentId ?? "", content, session);
      setContent("");
      setIsEmpty(true);
      setEditorKey((k) => k + 1); // remount the editor to clear it
      onDone?.(comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="comment-composer">
      <RichTextEditor
        key={editorKey}
        compact
        placeholder={placeholder ?? t("comment.placeholder")}
        onChange={(json, empty) => {
          setContent(json);
          setIsEmpty(empty);
        }}
      />
      {error && <div className="comment-composer__error">{error}</div>}
      <button
        type="button"
        className="btn btn--primary comment-composer__submit"
        onClick={handleSubmit}
        disabled={saving || isEmpty}
      >
        {saving ? t("comment.saving") : (submitLabel ?? t("comment.submit"))}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { CommentComposer } from "@/components/CommentComposer";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useTranslation } from "@/components/LanguageProvider";
import { updateComment } from "@/lib/api";
import { contentToHtml } from "@/lib/content";
import type { Comment, Session } from "@/lib/types";

export type CommentNode = Comment & { replies: CommentNode[] };

export function CommentItem({
  comment,
  session,
  onChanged,
}: {
  comment: CommentNode;
  session: Session | null;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editEmpty, setEditEmpty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isOwn = !!session && session.user.id === comment.userId;
  const date = new Date(comment.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  function startEdit() {
    setEditContent(comment.content);
    setEditEmpty(false);
    setError("");
    setEditing(true);
  }

  async function handleSaveEdit() {
    if (!session || editEmpty) return;
    setSaving(true);
    setError("");
    try {
      await updateComment(comment.id, editContent, session);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="comment">
      <div className="comment__header">
        <Link href={`/u/${encodeURIComponent(comment.username)}`} className="comment__author">
          @{comment.username}
        </Link>
        <time className="comment__date">{date}</time>
      </div>

      {editing ? (
        <div className="comment__edit">
          <RichTextEditor
            compact
            initialContent={editContent}
            placeholder={t("comment.placeholder")}
            onChange={(json, empty) => {
              setEditContent(json);
              setEditEmpty(empty);
            }}
          />
          {error && <div className="comment-composer__error">{error}</div>}
          <div className="comment__edit-actions">
            <button type="button" className="btn btn--pill" onClick={() => setEditing(false)}>
              {t("comment.cancel")}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveEdit}
              disabled={saving || editEmpty}
            >
              {saving ? t("comment.saving") : t("comment.save")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="comment__content"
            dangerouslySetInnerHTML={{ __html: contentToHtml(comment.content) }}
          />
          {session && (
            <div className="comment__actions">
              <button type="button" className="btn btn--pill" onClick={() => setReplying((v) => !v)}>
                {t("comment.reply")}
              </button>
              {isOwn && (
                <button type="button" className="btn btn--pill" onClick={startEdit}>
                  {t("comment.edit")}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {replying && (
        <div className="comment__replies">
          <CommentComposer
            postId={comment.postId}
            parentId={comment.id}
            placeholder={t("comment.replyPlaceholder")}
            onDone={() => {
              setReplying(false);
              onChanged();
            }}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className="comment__replies">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} session={session} onChanged={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentComposer } from "@/components/CommentComposer";
import { CommentItem, type CommentNode } from "@/components/CommentItem";
import { useTranslation } from "@/components/LanguageProvider";
import { listComments } from "@/lib/api";
import { getSession, onSessionChange } from "@/lib/session";
import type { Comment, Session } from "@/lib/types";

// Reconstructs the nested thread from the flat, oldest-first list returned by
// the API. Comments whose parent is missing (e.g. a deleted ancestor) are
// rendered as top-level so they are never silently dropped.
function buildTree(comments: Comment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of comments) byId.set(c.id, { ...c, replies: [] });

  const roots: CommentNode[] = [];
  for (const c of comments) {
    const node = byId.get(c.id)!;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export function CommentSection({ postId }: { postId: string }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(
    (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      listComments(postId)
        .then(setComments)
        .catch(() => setComments([]))
        .finally(() => setLoading(false));
    },
    [postId],
  );

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  useEffect(() => {
    const update = () => setSession(getSession());
    update();
    setMounted(true);
    return onSessionChange(update);
  }, []);

  const tree = buildTree(comments);

  return (
    <section className="comments">
      <div className="comments__header">
        <h2 className="comments__title">{t("comment.title")}</h2>
        <span className="comments__count">
          {comments.length}{" "}
          {t(comments.length === 1 ? "comment.comment" : "comment.comments")}
        </span>
      </div>

      {mounted ? (
        session ? (
          <CommentComposer
            postId={postId}
            onDone={(comment) => setComments((prev) => [...prev, comment])}
          />
        ) : (
          <p className="comment__login">{t("comment.login")}</p>
        )
      ) : null}

      {loading ? (
        <p className="empty">{t("post.loading")}</p>
      ) : tree.length === 0 ? (
        <p className="comments__empty">{t("comment.noComments")}</p>
      ) : (
        tree.map((node) => (
          <CommentItem
            key={node.id}
            comment={node}
            session={session}
            onChanged={() => refresh(false)}
          />
        ))
      )}
    </section>
  );
}

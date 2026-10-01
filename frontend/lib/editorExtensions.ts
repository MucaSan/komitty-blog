import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";

// Shared between the editor and the renderer (generateHTML / generateText).
export const editorExtensions = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false, autolink: true }),
  Image,
  TextStyle,
  Color,
  Highlight,
];

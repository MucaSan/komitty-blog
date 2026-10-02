import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

// Shared between the editor and the renderer (generateHTML / generateText).
export const editorExtensions = [
  StarterKit,
  Underline,
  Link.configure({ openOnClick: false, autolink: true }),
  Image,
  TextStyle,
  Color,
  Highlight,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

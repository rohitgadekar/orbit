import { redirect } from "next/navigation";

export default function AlbumsRedirectPage() {
  redirect("/music?view=albums");
}


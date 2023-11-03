import { RedirectType, redirect } from "next/navigation";

export default function Contacts(): void {
  redirect ('/', RedirectType.replace)
}

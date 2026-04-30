// import React from "react";
import { redirect } from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/approvals");
  // return (
  //   <div className="p-8">
  //     <h1 className="text-4xl font-headline font-bold mb-4">Overview Page</h1>
  //   </div>
  // );
}

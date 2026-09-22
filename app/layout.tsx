import "./globals.css"; import type {Metadata} from "next";
export const metadata:Metadata={title:"OfficeOps",description:"Shared office task board"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

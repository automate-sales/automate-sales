import Link from "next/link"
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline"
import { getInitials } from "sdk/utils"
import { PrismaClient } from "database"
import type { Url } from "next/dist/shared/lib/router/router"

function ExternalLink({
  href,
  text
}:{
  href: Url | null | undefined,
  text: string
}): JSX.Element {
  return (

        href? <Link className="flex items-center text-blue-700" href={href} target="_blank">
              <div className="pr-[2px]">{text}</div>
              <ArrowTopRightOnSquareIcon className="h-4 w-4"/>
            </Link> : <div>{text}</div>
  )
}

const boardId = 5244733915

export async function ContactInfo({contactId}: {contactId: string}): Promise<JSX.Element>{
  const prisma = new PrismaClient()  
  const contact = await prisma.contact.findUnique({
    where: {
      id: contactId
    }
  })
    
    return(
      <div className="flex justify-between px-3 py-1 leading-tight">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-medium uppercase">{getInitials(contact?.name)}</div>
        <div className="flex-col">
          <ExternalLink
            href={contact?.monday_id ? `${process.env.NEXT_PUBLIC_MONDAY_URL}/boards/${boardId}/pulses/${contact.monday_id}` : null}
            text={contact?.name || '?'}
          />
          <Link className="text-sm" href={`tel:${contact?.phone_number}`}>{contact?.phone_number}</Link>
        </div>
      </div>

      <div className="flex-col">
        <ExternalLink
          href={`${process.env.NEXT_PUBLIC_MONDAY_URL}/boards/${boardId}`}
          text="Contactos" 
        />
        <div className="text-sm">{contact?.contact_source}</div>
      </div>
    </div>
    )
}
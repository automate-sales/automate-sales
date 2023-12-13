import {
  UserCircleIcon,
  MapPinIcon,
  CameraIcon,
  PaperClipIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  CheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import type { Chat } from "database";
import { formatDate } from "sdk/utils";
import Image from "next/image";
import { AudioMessage } from "./audio-message";


function IconMessage({ message, icon }: { message: Chat, icon: JSX.Element }): JSX.Element{
  return (
    <div className="flex items-center justify-center">
      <Link 
        className="flex flex-col items-center" 
        href={message.media} 
        target="_blank" 
      >
          <span className="pb-1">{message.name}</span>
          {icon}
      </Link>
    </div>
  );
};

function ImageMessage({ message }: { message: Chat  }): JSX.Element{
  return message.media ? (
    <div className="flex items-center justify-center">
      {
        message.media && message.media.startsWith('http') ? <Link href={message.media} target="_blank">
            <Image alt={message.name || ''} className="w-32 h-auto" height={200} src={message.media || ''} width={200} />
        </Link> : <span className="pb-1">{message.name}</span>
      }
    </div>
  ) : (
    <IconMessage icon={<CameraIcon aria-label="Camera" className="h-6 w-6"/>} message={message} />
  );
};

function VideoMessage({ message }: { message: Chat  }): JSX.Element{
  return message.media ? (
    <div className="flex items-center justify-center">
      <video className="w-32 h-auto" controls height={120} width={96}>
        <source src={message.media} />
        <track kind="captions" />
      </video>
    </div>
  ) : (
    <IconMessage icon={<VideoCameraIcon aria-label="Video Camera" className="h-6 w-6"/>} message={message} />
  );
};

interface ContactObject {
  name: string,
  phone: string
}

function ContactMessage({ message }: { message: Chat & {contact_object: ContactObject} }): JSX.Element{
  return (
    <div className="flex items-center justify-center">
      <UserCircleIcon aria-label="Contact" className="h-8 w-8 mr-2" />
      <div className="text-sm">
        <div>{message.contact_object.name}</div>
        <Link className="text-blue-700 underline" href={`tel:${message.contact_object.phone}`}>{message.contact_object.phone}</Link>
      </div>
    </div>
  );
};

interface Location {
  address: string,
  lat: number,
  lng: number
}

function LocationMessage({ message }: { message: Chat & {location: Location } }): JSX.Element {
  const query = message.location.address ? message.location.address.replaceAll(' ', '+') : `${message.location.lat},${message.location.lng}`
  return (
    <div className="flex items-center justify-center">
      <Link className="flex flex-col items-center" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank">
          <span className="pb-1 text-blue-700 underline">{message.location.address || 'Location'}</span>
          <MapPinIcon aria-label="Location" className="h-6 w-6"/>
      </Link>
    </div>
  );
};


interface LinkObject {
  url: string,
  title: string,
  text?: string,
  image?: string,
  description?: string
}
function LinkMessage({ message }: { message: Chat & { link: LinkObject } }): JSX.Element{
  return (
      <Link className="flex flex-col" href={message.link.url} target="_blank">
          <div className="bg-slate-900 p-2">
            {message.link.image ? <Image alt={message.link.title} className="w-full h-auto" height={200} src={message.link.image} width={200} /> : <PaperClipIcon aria-label="Link" className="h-6 w-6"/>}
            <div className="text-white text-sm font-bold pt-1">{message.link.title}</div>
            {message.link.description ? <div className="text-white text-xs">{message.link.description}</div> : null}
          </div>
          <div className="pb-1 text-blue-600 underline">{message.link.url}</div>
      </Link>
  );
};

function MessageBody({ message }: { message: Chat }): JSX.Element {
  switch (message.type) {
    case 'image':
      return <ImageMessage message={message} />;
    case 'media':
      return <ImageMessage message={message} />;
    case 'video':
      return <VideoMessage message={message} />;
    case 'audio':
      return <AudioMessage message={message} />;
    case 'contacts':
      return <ContactMessage message={message as Chat & {contact_object: ContactObject}} />;
    case 'location':
      return <LocationMessage message={message as Chat & {location: Location}} />;
    case 'link':
      return <LinkMessage message={message as Chat & {link: LinkObject}} />;
    case 'document':
      return <IconMessage icon={<DocumentTextIcon aria-label="Document" className="h-6 w-6"/>} message={message} />
    case 'sticker':
      return message.media?.endsWith('.mp4') ?
          <VideoMessage message={message} /> : <ImageMessage message={message} />
    default:
      return <div className="flex">{message.text}</div>;
  }
};

function MessageStatus({ message }: { message: Chat }): JSX.Element{
  if (message.direction === 'incoming') {
    return message.responded ? (
      <CheckIcon className="text-blue-500 h-6 w-6" />
    ) : (
      <ExclamationCircleIcon className="text-orange-500 h-6 w-6"/>
    );
  }
  switch (message.status) {
    case 'sent':
      return <CheckIcon className="text-green-500 h-6 w-6" />;
    case 'delivered':
      return <CheckCircleIcon className="text-green-500 h-6 w-6" />;
    case 'read':
      return <CheckCircleIcon className="text-blue-500 h-6 w-6" />;
    case 'failed':
      return <XCircleIcon className="text-red-500 h-6 w-6" />;
    default:
      return <div/>
  }
};

export default function MessageBox({ message }: { message: Chat }) : JSX.Element {
  return (
    <div className={`flex ${message.direction === 'outgoing' ? 'flex-row-reverse' : 'flex-row'} items-center mb-2`}>
      <div className={`${message.direction === 'outgoing' ? 'bg-green-200' : 'bg-white'} rounded-sm p-4 max-w-xs `}>
        <div className="flex items-center justify-end pb-1">
          {message.direction === 'outgoing' && (
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-700 text-white flex items-center justify-center text-sm font-medium uppercase" title={message.updatedBy || 'Unknown'}>
              {message.updatedBy ? message.updatedBy : '?'}
            </div>
          )}
        </div>
        <MessageBody message={message} />
        <div className="flex gap-3 items-center justify-between mt-2 text-sm text-gray-500">
          <div>{formatDate(message.chatDate)}</div>
          <MessageStatus message={message} />
        </div>
        {/* <Link href={`${process.env.NEXT_PUBLIC_MONDAY_URL}/boards/${chatBoardId}/pulses/${message.id}`} target="_blank" className="flex items-center mt-2 text-xs text-blue-600 hover:text-blue-800">
            Open in monday.com
            <ArrowTopRightOnSquareIcon className="ml-1 h-4 w-4" />
        </Link> */}
      </div>
    </div>
  );
}

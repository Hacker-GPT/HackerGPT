import { IconMessagePlus } from '@tabler/icons-react';
import { FC } from 'react';

import { Conversation } from '@/types/chat';

interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
  selectedConversation,
  onNewConversation,
}) => {
  return (
    <nav className="flex w-full items-center justify-between bg-hgpt-dark-gray px-4 py-3">
      <div className="mr-4"></div>

      <div className="flex-1 truncate text-center text-base font-normal">
        {selectedConversation.name}
      </div>

      <div>
        <IconMessagePlus
          className="cursor-pointer hover:text-neutral-400"
          onClick={onNewConversation}
        />
      </div>
    </nav>
  );
};

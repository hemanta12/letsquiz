import React from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import MenuIcon from '@mui/icons-material/Menu';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IconName } from './types';

export const icons: Record<IconName, React.FC> = {
  play: PlayArrowIcon,
  pause: PauseIcon,
  close: CloseIcon,
  check: CheckIcon,
  arrowRight: ArrowForwardIcon,
  person: PersonIcon,
  group: GroupIcon,
  shuffle: ShuffleIcon,
  menu: MenuIcon,
  edit: EditIcon,
  expandMore: ExpandMoreIcon,
  delete: DeleteIcon,
};

export type MediaContext = 'POST' | 'PROFILE_PHOTO' | 'AVATAR' | 'MESSAGE';

export type RequestUploadDto = {
  fileName: string;
  fileType: string;
  fileSize: number;
  context: MediaContext;
};

export type ConfirmUploadDto = {
  key: string;
};

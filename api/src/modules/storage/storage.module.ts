import { Global, Module } from '@nestjs/common';
import { FileTokenService } from './file-token.service';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';

@Global()
@Module({
  controllers: [FilesController],
  providers: [StorageService, FileTokenService],
  exports: [StorageService, FileTokenService],
})
export class StorageModule {}

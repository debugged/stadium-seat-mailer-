import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailService } from '@sendgrid/mail';
import { SendEmailEntity } from './order.entity';
import * as sendgrid from '@sendgrid/mail';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      synchronize: true,
      logging: false,
      logger: "simple-console",
      database: "./database.sqlite",
      entities: [SendEmailEntity],
    })
  ],
  providers: [
    {
      provide: MailService,
      useFactory: () => {
        sendgrid.setApiKey('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');
        return sendgrid;
      }
    }
  ],
})
export class AppModule {}

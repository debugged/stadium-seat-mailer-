import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MailService } from '@sendgrid/mail';
import { Connection } from 'typeorm';
import { SendEmailEntity } from './order.entity';
import { glob } from 'glob';

import * as path from 'path';
import * as fs from 'fs';

let connection: Connection;
let mailService: MailService;

const INPUT = 'input';
const TEMPLATE = fs.readFileSync(path.join(__dirname, `../email.txt`), 'utf-8');


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  mailService = app.get(MailService);
  connection = app.get(Connection);


  const emailsDirectories = await getDirectories(INPUT);
  for(const emailDirectory of emailsDirectories) {
    await processEmail(emailDirectory)
  }
}

async function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

async function globDir(path: string) {
  return new Promise<string[]>((resolve, reject) => {
    glob(path, function (err, files) {
      if(err){
        reject(err);
      }else {
        resolve(files);
      }
    })
  });
}

async function processEmail(processEmail: string) {
  return connection.transaction(async entityManager => {
    const repo = entityManager.getRepository(SendEmailEntity);

    const foundEmail = await repo.findOne({where: {
      email: processEmail
    }});

    if(foundEmail !== undefined) {
      console.log('email already send')
      return;
    }
    
    const sendEmail = new SendEmailEntity();
    sendEmail.email = processEmail;

    const orderFiles = await globDir(path.join(__dirname, `../${INPUT}/${processEmail}/*.pdf`));
    const tickets = await Promise.all(orderFiles.map(async (file) => {
      return {
        content: fs.readFileSync(file).toString("base64"),
        filename: path.basename(file),
        type: "application/pdf",
        disposition: "attachment"
      }
    }));

    const msg = {
      to: 'kyle@debugged.nl',
      from: { email: 'info@ticketapp.nl', name: '' },
      subject: '',
      html: TEMPLATE,
      attachments: [
        ...tickets
      ]
    };

    await mailService.send(msg);
    await repo.save(sendEmail);

    console.log(`tickets from ${sendEmail} send`);
  })
}
bootstrap().then(() => console.log("DONE!")).catch(error => console.log(error));

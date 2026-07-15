import { Controller, Body, Post } from '@nestjs/common';
import { ContactUsService } from './contact-us.service';

@Controller('contact-us')
export class ContactUsController {
  constructor(private readonly contactUsService: ContactUsService) {}

  @Post()
  async submitContactUsForm(
    @Body()
    Body: {
      name: string;
      email: string;
      role: string;
      subject: string;
      message: string;
    },
  ) {
    return this.contactUsService.sendToSlack(Body);
  }
}

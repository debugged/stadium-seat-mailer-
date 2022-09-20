import { Column, Entity } from "typeorm";

@Entity('order')
export class SendEmailEntity {
    @Column('varchar', {name: 'email', primary: true})
    email!: string;
}
import { PrismaClient } from 'database';
import styles from "./page.module.css";

export default async function Page(): Promise<JSX.Element> {
  const prisma = new PrismaClient();
  const data = await prisma.contact.findMany();

  return (
    <main className={styles.main}>
      <div style={{color: 'white'}}>
        {data.map((contact) => (
          <div key={contact.id}>
            <span>{contact.name}</span>
            <span>{contact.email}</span>
          </div>
        ))}
      </div>
    </main>
  );
}

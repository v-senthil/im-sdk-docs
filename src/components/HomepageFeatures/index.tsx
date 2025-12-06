import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Unified Messaging',
    description: (
      <>
        Integrate multiple instant messaging platforms with a single unified
        API. WhatsApp, Telegram, Facebook Messenger, Instagram, Line, and
        WeChat supported.
      </>
    ),
  },
  {
    title: 'Template Messages',
    description: (
      <>
        Create and manage WhatsApp template messages for proactive customer
        engagement. Supports multi-lingual templates and interactive components.
      </>
    ),
  },
  {
    title: 'Real-Time Notifications',
    description: (
      <>
        Receive real-time events for messages, sessions, and status updates.
        Build responsive applications with push-based notifications.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

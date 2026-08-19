export interface WhatsAppTemplate {
  id: string;
  title: string;
  category: 'Intro' | 'FollowUp' | 'Proposal' | 'Meeting' | 'Special';
  text: string;
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'intro-formal',
    title: '👋 Initial Introduction & Portfolio',
    category: 'Intro',
    text: `Hi {{name}}, hope you're having a productive day! 🌟\n\nI'm {{salesperson}} from our business growth team. We noticed {{company}} is expanding in the {{industry}} space and wanted to introduce our {{service}} solutions.\n\nWould you be open to a quick 5-minute chat this week to explore how we can help you scale?`
  },
  {
    id: 'company-profile',
    title: '📄 Company Profile & Deck Delivery',
    category: 'Intro',
    text: `Hi {{name}}, as discussed during our call, I'm sharing our official company presentation and case studies for {{service}}.\n\nFeel free to review at your convenience. Let me know when you'd like to discuss the next steps!`
  },
  {
    id: 'follow-up-gentle',
    title: '⏳ Gentle Follow-Up / Touch Base',
    category: 'FollowUp',
    text: `Hi {{name}}, following up on our previous conversation regarding {{service}} for {{company}}.\n\nDid you get a chance to review the details we discussed? Happy to answer any questions or jump on a quick call whenever you're free!`
  },
  {
    id: 'proposal-sent',
    title: '💼 Custom Proposal / Quotation Follow-up',
    category: 'Proposal',
    text: `Hi {{name}}, I've just prepared and sent over the tailored proposal for {{company}} regarding {{service}}.\n\nPlease take a look and let me know your thoughts. We've customized the scope and pricing to best match your current targets!`
  },
  {
    id: 'meeting-confirmation',
    title: '📅 Meeting Confirmation & Agenda',
    category: 'Meeting',
    text: `Hi {{name}}, confirming our upcoming scheduled meeting regarding {{service}} for {{company}}.\n\nLooking forward to speaking with you! Please let me know if you need any adjustments to the schedule.`
  },
  {
    id: 'quick-checkin-nodrop',
    title: '🔥 Decision Maker Quick Check-in',
    category: 'FollowUp',
    text: `Hi {{name}}, hope all is well! Are you still looking to move forward with {{service}} this month? We have reserved onboarding capacity for {{company}} and would love to support your goals.`
  }
];

export function fillWhatsAppTemplate(templateText: string, lead: { name: string; companyName: string; industry: string; serviceRequired: string }, salesperson: string): string {
  return templateText
    .replace(/\{\{name\}\}/g, lead.name || 'there')
    .replace(/\{\{company\}\}/g, lead.companyName || 'your company')
    .replace(/\{\{industry\}\}/g, lead.industry || 'your industry')
    .replace(/\{\{service\}\}/g, lead.serviceRequired || 'our services')
    .replace(/\{\{salesperson\}\}/g, salesperson || 'our team');
}

export function generateWhatsAppLink(phoneNumber: string, message: string): string {
  // Clean phone number: remove spaces, plus, hyphens, parenthesis
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

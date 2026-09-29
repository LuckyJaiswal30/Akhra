import type { ProblemStatus } from '@akhra/shared';
import type { ReportState } from './recipients';

export interface ReporterMessage {
  /** The email subject and the notice's title. */
  subject: string;
  /** What just happened. */
  lead: string;
  /** What it means for the reporter, or what happens next. */
  next: string;
  /** How to introduce a note someone wrote, such as a reason. */
  noteLabel: string;
}

const list = (names: string[], hindi: boolean) =>
  names.length <= 1
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} ${hindi ? 'और' : 'and'} ${names.at(-1)}`;

function english(status: ProblemStatus, report: ReportState): Omit<ReporterMessage, 'noteLabel'> {
  const department = report.department ?? 'The department';
  const institutions = list(report.institutions, false) || 'a university';
  switch (status) {
    case 'validated':
      return {
        subject: 'Your report has been checked',
        lead: 'Your district officer has checked your report.',
        next: 'Next, they will send it to the department or university that can fix it.',
      };
    case 'routed':
      return {
        subject: 'Your report has been sent to a university',
        lead: `Your report has been sent to ${institutions}.`,
        next: 'Their team will read it and decide whether to take it up. We will email you when they do.',
      };
    case 'assigned':
      return {
        subject: `Your report has been sent to ${report.department ?? 'a department'}`,
        lead: `Your report has been sent to ${report.department ?? 'the department'}.`,
        next: 'They have 21 days to fix it and write down what they did. We will email you when they do.',
      };
    case 'action_taken':
      return {
        subject: `${department} says the work is done`,
        lead: `${department} says the work is done.`,
        next: 'Please check whether it is really fixed, then tell us on your report page. If it is not fixed, you can send it back to them.',
      };
    case 'in_progress':
      return {
        subject: 'Work has started on your report',
        lead: 'A university team has started working on your report.',
        next: 'We will email you each time they finish a step.',
      };
    case 'prototyped':
      return {
        subject: 'A first version of the solution is ready',
        lead: 'The team has built a first version of the solution.',
        next: 'Next, they will try it out in the field.',
      };
    case 'piloted':
      return {
        subject: 'The solution is being tried out in the field',
        lead: 'The solution is now being tried out in the field.',
        next: 'If it works well, it will be put into regular use.',
      };
    case 'deployed':
      return {
        subject: 'The solution is now in use',
        lead: 'The solution is now in use.',
        next: 'Your district officer will close the report once they have checked that it works.',
      };
    case 'closed':
      return {
        subject: 'Your report is closed',
        lead: 'Your report is now closed.',
        next: 'Thank you for reporting it. It helps everyone in your area.',
      };
    case 'rejected':
      return {
        subject: 'Your report could not be taken forward',
        lead: 'Your district officer could not take this report forward.',
        next: 'If the problem is still there, you can report it again with more detail or a photo.',
      };
    case 'duplicate':
      return {
        subject: 'Someone had already reported this problem',
        lead: 'Someone had already reported this problem.',
        next: 'Your report has been joined to theirs, so you will get the same updates from now on.',
      };
    case 'on_hold':
      return {
        subject: 'Work on your report is paused',
        lead: 'Work on your report is paused for now.',
        next: 'We will email you when it starts again.',
      };
    case 'submitted':
      return {
        subject: 'Your report is back with your district officer',
        lead: 'Your report is back with your district officer.',
        next: 'They will check it again.',
      };
  }
}

function hindi(status: ProblemStatus, report: ReportState): Omit<ReporterMessage, 'noteLabel'> {
  const department = report.department ?? 'विभाग';
  const institutions = list(report.institutions, true) || 'एक विश्वविद्यालय';
  switch (status) {
    case 'validated':
      return {
        subject: 'आपकी रिपोर्ट जाँच ली गई है',
        lead: 'आपके ज़िला अधिकारी ने आपकी रिपोर्ट जाँच ली है।',
        next: 'अब वे इसे उस विभाग या विश्वविद्यालय को भेजेंगे जो इसे ठीक कर सकता है।',
      };
    case 'routed':
      return {
        subject: 'आपकी रिपोर्ट एक विश्वविद्यालय को भेजी गई है',
        lead: `आपकी रिपोर्ट ${institutions} को भेजी गई है।`,
        next: 'उनकी टीम इसे पढ़कर तय करेगी कि इस पर काम करे या नहीं। जब वे इसे अपनाएँगे, हम आपको ईमेल करेंगे।',
      };
    case 'assigned':
      return {
        subject: `आपकी रिपोर्ट ${department} को भेजी गई है`,
        lead: `आपकी रिपोर्ट ${department} को भेजी गई है।`,
        next: 'उनके पास इसे ठीक करने और किया गया काम लिखने के लिए 21 दिन हैं। जब वे ऐसा करेंगे, हम आपको ईमेल करेंगे।',
      };
    case 'action_taken':
      return {
        subject: `${department} के अनुसार काम पूरा हो गया है`,
        lead: `${department} के अनुसार काम पूरा हो गया है।`,
        next: 'कृपया देखें कि समस्या सच में ठीक हुई या नहीं, फिर अपनी रिपोर्ट के पेज पर बताएँ। ठीक न हुई हो, तो आप इसे उन्हें वापस भेज सकते हैं।',
      };
    case 'in_progress':
      return {
        subject: 'आपकी रिपोर्ट पर काम शुरू हो गया है',
        lead: 'एक विश्वविद्यालय टीम ने आपकी रिपोर्ट पर काम शुरू कर दिया है।',
        next: 'हर चरण पूरा होने पर हम आपको ईमेल करेंगे।',
      };
    case 'prototyped':
      return {
        subject: 'समाधान का पहला रूप तैयार है',
        lead: 'टीम ने समाधान का पहला रूप बना लिया है।',
        next: 'अब वे इसे फ़ील्ड में आज़माएँगे।',
      };
    case 'piloted':
      return {
        subject: 'समाधान को फ़ील्ड में आज़माया जा रहा है',
        lead: 'समाधान को अब फ़ील्ड में आज़माया जा रहा है।',
        next: 'अगर यह ठीक काम करता है, तो इसे नियमित रूप से अपनाया जाएगा।',
      };
    case 'deployed':
      return {
        subject: 'समाधान अब उपयोग में है',
        lead: 'समाधान अब उपयोग में है।',
        next: 'यह ठीक काम कर रहा है, यह देखने के बाद आपके ज़िला अधिकारी रिपोर्ट बंद करेंगे।',
      };
    case 'closed':
      return {
        subject: 'आपकी रिपोर्ट बंद हो गई है',
        lead: 'आपकी रिपोर्ट अब बंद है।',
        next: 'रिपोर्ट करने के लिए धन्यवाद। इससे आपके पूरे इलाके को मदद मिलती है।',
      };
    case 'rejected':
      return {
        subject: 'आपकी रिपोर्ट आगे नहीं बढ़ाई जा सकी',
        lead: 'आपके ज़िला अधिकारी इस रिपोर्ट को आगे नहीं बढ़ा सके।',
        next: 'अगर समस्या अब भी है, तो आप ज़्यादा जानकारी या फ़ोटो के साथ इसे फिर से दर्ज कर सकते हैं।',
      };
    case 'duplicate':
      return {
        subject: 'यह समस्या पहले ही दर्ज हो चुकी थी',
        lead: 'यह समस्या किसी ने पहले ही दर्ज कर दी थी।',
        next: 'आपकी रिपोर्ट उनकी रिपोर्ट से जोड़ दी गई है, इसलिए अब से आपको भी वही अपडेट मिलेंगे।',
      };
    case 'on_hold':
      return {
        subject: 'आपकी रिपोर्ट पर काम अभी रुका है',
        lead: 'आपकी रिपोर्ट पर काम फ़िलहाल रोका गया है।',
        next: 'काम फिर शुरू होने पर हम आपको ईमेल करेंगे।',
      };
    case 'submitted':
      return {
        subject: 'आपकी रिपोर्ट फिर से ज़िला अधिकारी के पास है',
        lead: 'आपकी रिपोर्ट फिर से आपके ज़िला अधिकारी के पास है।',
        next: 'वे इसे फिर से जाँचेंगे।',
      };
  }
}

const NOTE_LABEL: Record<'en' | 'hi', Partial<Record<ProblemStatus, string>> & { other: string }> =
  {
    en: { action_taken: 'What they did:', rejected: 'Reason:', other: 'Note:' },
    hi: { action_taken: 'उन्होंने क्या किया:', rejected: 'कारण:', other: 'टिप्पणी:' },
  };

export function reporterMessage(
  status: ProblemStatus,
  report: ReportState,
  locale: string,
): ReporterMessage {
  const lang = locale === 'hi' ? 'hi' : 'en';
  const message = lang === 'hi' ? hindi(status, report) : english(status, report);
  return { ...message, noteLabel: NOTE_LABEL[lang][status] ?? NOTE_LABEL[lang].other };
}

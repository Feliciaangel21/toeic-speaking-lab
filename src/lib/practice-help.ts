import type { Question } from "./types";

export type PracticeHelp = {
  hint: string;
  guideWords: string[];
  structure: string[];
  sampleAnswer: string;
  why: string;
  officialFocus: string[];
  coachNote?: string;
};

const SLOT_KO: Record<string,string> = {
  frequency:"빈도", time:"시간", item:"주문 메뉴", factor:"선택 기준", reason:"이유",
  type:"종류", change:"개선점", explanation:"설명", companion:"동행인", place:"장소",
  description:"묘사", products:"제품 종류", advantage:"장점", disadvantage:"단점",
  location:"장소", movie:"영화", method:"방법", preference:"선호", factors:"요인",
  reasons:"이유", duration:"시간", application:"앱", benefit:"장점", example:"구체적 예시",
  experience:"경험"
};

const pictureAnswers: Record<string,string> = {
  pic01:"This picture was taken in an office meeting room. Several people are sitting around a table, and they seem to be discussing a project. A laptop and some work materials are on the table. One person appears to be explaining something while the others are listening. In the background, I can see a bright and modern office. Overall, the people look focused and the atmosphere seems professional.",
  pic02:"This picture shows a supermarket aisle. Two people are shopping and looking at products on the shelves. A shopping cart is nearby, and the shelves are filled with different groceries. One person seems to be choosing an item while the other is standing next to the cart. The store looks clean and well organized. Overall, it looks like an ordinary shopping trip at a busy supermarket.",
  pic03:"This picture was taken inside a café. Several customers are sitting at tables, and some of them appear to be talking with friends. I can also see a counter and many lights in the background. The café looks fairly busy, but the atmosphere seems comfortable. Some people may be eating or drinking coffee. Overall, it looks like a popular place where people can relax and spend time together.",
  pic04:"This picture shows a business presentation in a conference room. A presenter is standing near a screen and speaking to a group of colleagues. Several people are seated at a table with laptops in front of them. They seem to be paying attention to the presentation. The room is modern and well lit. Overall, it looks like the group is having a professional meeting or discussing a work project.",
  pic05:"This picture was taken in a large indoor market. Many people are walking around and shopping. I can see shopping carts, signs, and displays of different products. Some customers appear to be looking at produce while others are moving through the market. The area looks crowded and lively. Overall, it seems to be a busy shopping area where people can buy fresh food and other items.",
  pic06:"This picture shows a public park on a pleasant day. Several people are relaxing on the grass, while others appear to be walking nearby. There are many trees around the area, so the park looks green and peaceful. Some people are sitting and talking, and others may be enjoying the weather. Overall, it looks like a comfortable place for people to spend time outdoors and take a break.",
  pic07:"This picture was taken at a train station. Several commuters are standing on a platform and waiting for a train. Some people are looking at their phones, while others are facing the tracks. The station appears to be fairly busy. People are standing in different parts of the platform with their belongings. Overall, it looks like a normal commuting scene during a busy part of the day.",
  pic08:"This picture shows a modern lobby with a long reception desk. A staff member appears to be working behind the counter. The lobby is spacious and has bright lighting. The reception area looks clean and organized, and there is plenty of open space in front of the desk. Overall, it seems to be the entrance of a hotel or office building where visitors can check in or ask for information.",
  pic09:"This picture was taken at a construction site. Several workers are wearing hard hats and safety equipment. They appear to be working near a large building that is still under construction. I can see construction materials and equipment around the area. The workers seem focused on their tasks. Overall, it looks like a busy work site where safety is important and a building project is in progress."
};

const interviewAnswers: Record<string,string> = {
  "iq01-q1":"I visit a coffee shop about three times a week. I usually go in the afternoon after class, especially when I need a quiet place to study or meet a friend.",
  "iq01-q2":"I usually order an iced Americano because I prefer simple coffee. If I am hungry, I sometimes add a sandwich or a small dessert as well.",
  "iq01-q3":"The most important thing for me is a comfortable atmosphere. I often study at coffee shops, so I need enough seats, good lighting, and a reasonable noise level. For example, if the music is too loud, I cannot concentrate. I also prefer places with convenient outlets because I sometimes use my laptop for several hours.",
  "iq02-q1":"I use public transportation almost every day. During the week, I usually take the subway to school because it is faster and more predictable than driving.",
  "iq02-q2":"I use the subway most often because it is fast and reliable. It also avoids traffic, so I can usually predict exactly how long my trip will take.",
  "iq02-q3":"More frequent buses would make public transportation much more convenient in my area. At night, I sometimes have to wait twenty minutes or longer. If buses arrived every ten minutes, people could travel more easily without checking the schedule constantly. I think this would especially help students and workers who come home late.",
  "iq03-q1":"I take a short weekend trip about once a month. I usually go after a busy week or after I finish an important assignment because I like getting away from the city.",
  "iq03-q2":"I usually travel with one or two close friends. We enjoy similar activities, and traveling in a small group makes it much easier to choose restaurants and plan transportation.",
  "iq03-q3":"I would recommend a lakeside park about an hour from my city. It has walking trails, several cafés, and a beautiful view of the water. Visitors can rent bicycles or simply relax near the lake. It is close enough for a day trip, but the environment feels very different from the city, so it is a good place to recharge.",
  "iq04-q1":"I shop online about two or three times a month. I usually order something when I cannot find it easily in nearby stores or when the online price is better.",
  "iq04-q2":"I usually buy clothes, household items, and small electronics online. Those products are easy to compare, and I can read reviews before deciding which one to buy.",
  "iq04-q3":"One major advantage of shopping online is convenience because I can shop at any time and compare many stores quickly. However, the disadvantage is that I cannot see or try the product first. For example, clothes may look different in person or may not fit well, so sometimes I have to return what I ordered.",
  "iq05-q1":"I usually exercise four days a week. I try to work out for about forty minutes each time, usually in the evening after I finish work or studying.",
  "iq05-q2":"I prefer to exercise at a gym because it has more equipment. I can also work out there comfortably even when the weather is extremely hot, cold, or rainy.",
  "iq05-q3":"I think having a fixed routine is the best way to continue exercising regularly. If exercise is already part of your weekly schedule, you do not have to decide when to do it every day. For example, I always exercise on Monday, Wednesday, Friday, and Saturday. That routine makes it easier to stay consistent even when I am busy.",
  "iq06-q1":"I watch movies about once or twice a week. I usually watch them on weekend evenings because that is when I have enough free time to relax.",
  "iq06-q2":"I prefer watching movies at home because it is cheaper and more comfortable. I can also pause the movie whenever I need a break or want to get something to eat.",
  "iq06-q3":"I recently watched a mystery movie with my friends, and I enjoyed it a lot. The story was unpredictable, so I kept trying to guess what would happen next. The characters were also interesting and believable. After the movie ended, my friends and I spent another thirty minutes discussing the ending, which made the experience even more memorable.",
  "iq07-q1":"I usually study at the university library because it is quiet and I can concentrate better there. I also like having books, computers, and study rooms nearby.",
  "iq07-q2":"I am most productive in the morning, especially between nine and noon. I have more energy then, and there are usually fewer messages and other distractions.",
  "iq07-q3":"The best way for me to stay focused is to study in short blocks and put my phone away. For example, I study for about fifty minutes and then take a ten-minute break. During that time, I keep my phone in my bag so I cannot check messages. This method helps me concentrate without becoming too tired.",
  "iq08-q1":"I eat at a restaurant about once or twice a week. I usually go on the weekend with friends or family when we have more time to enjoy a meal together.",
  "iq08-q2":"I visit Korean restaurants most often because there are many affordable choices near my home. I also like that everyone can order several dishes and share them.",
  "iq08-q3":"Good food and consistent service are the main reasons I return to the same restaurant. I want the food to taste good every time, and friendly staff make the experience more comfortable. Reasonable prices are important too. For example, if a restaurant has good food but becomes too expensive, I will probably start looking for another place.",
  "iq09-q1":"I use my smartphone for about four hours a day. I use it throughout the day for messages, maps, music, banking, and checking information online.",
  "iq09-q2":"I use a messaging application most often because I communicate with classmates, friends, and family throughout the day. I also use it to share files and organize group plans.",
  "iq09-q3":"Smartphones have made daily life easier because we can get information and complete many tasks immediately. For example, when I travel somewhere new, I can check a map, find the fastest route, and pay for transportation with the same device. I can also contact someone right away if my plans change, which saves a lot of time.",
  "iq10-q1":"Yes, I have done volunteer work before. I helped at a community event by organizing materials, giving directions to visitors, and cleaning the area afterward.",
  "iq10-q2":"I would be willing to volunteer about six hours a month. That would let me contribute regularly while still leaving enough time for my studies, work, and other responsibilities.",
  "iq10-q3":"I think people volunteer because they want to help others and feel more connected to their community. It can also be personally rewarding because volunteers meet new people and see the direct results of their effort. For example, helping at a neighborhood event can make someone feel that they are contributing to a place where they actually live.",
  "iq11-q1":"I usually take the subway to school, and the trip takes about thirty-five minutes. It is convenient because the station is close to my home and traffic does not affect the travel time.",
  "iq11-q2":"Transportation is most crowded between about seven thirty and nine in the morning. That is when many students and office workers are commuting at the same time.",
  "iq11-q3":"I think adding more buses and trains during rush hour would make commuting much easier. Right now, vehicles can become extremely crowded, so passengers sometimes have to wait for the next one. If service were more frequent during the busiest periods, people could travel more comfortably and would be less likely to arrive late for work or school.",
  "iq12-q1":"I last visited a library about two weeks ago because I needed a quiet place to prepare for an exam. I also borrowed a book that was not available online.",
  "iq12-q2":"I use the study spaces most often because they are quiet and have large desks and reliable Wi-Fi. I sometimes use the online journal database as well.",
  "iq12-q3":"Yes, I think libraries should offer more digital services. Many people cannot visit during normal opening hours, so online books, journals, and reservation systems make library resources easier to access. For example, students could borrow an electronic book late at night instead of waiting until the next day. Digital services should not replace physical libraries, but they can make them much more useful.",
  "iq13-q1":"I stay at a hotel a few times a year, mostly when I travel for vacation. Occasionally I also stay in one when I attend an event in another city.",
  "iq13-q2":"I use the breakfast service most often because it saves time in the morning. I also appreciate luggage storage when I arrive before check-in or leave after checkout.",
  "iq13-q3":"Location is more important to me than price when I choose a hotel. I am willing to pay a little more if I can stay close to public transportation and the places I want to visit. For example, a cheaper hotel far outside the city may require an hour of commuting every day, which wastes both time and transportation money.",
  "iq14-q1":"I buy new clothes about once every month or two. I usually shop at a shopping mall because I like comparing several stores and trying things on before buying them.",
  "iq14-q2":"I usually shop for clothes alone because I can take my time and make decisions more quickly. Sometimes I go with a friend when I want another opinion.",
  "iq14-q3":"The most important thing I consider is whether I will actually wear the item often. A piece of clothing may look nice, but it is not a good purchase if it does not match anything I own. For example, I prefer simple clothes that I can wear to school, work, or casual meetings because they are more practical.",
  "iq15-q1":"On Saturday mornings, I usually sleep a little later, eat breakfast at home, and exercise. If I have errands to do, I try to finish them before lunch.",
  "iq15-q2":"I usually spend my weekends with close friends or family. I also keep part of Sunday for myself so I can rest and prepare for the next week.",
  "iq15-q3":"I would rather plan most of my weekend in advance because it helps me use my free time well. If I want to meet friends or visit a popular place, making plans early prevents scheduling problems. However, I do not plan every hour. I like leaving some free time so I can rest or do something spontaneous if I feel like it."
};
const infoAnswers: Record<string,string> = {
  "ig01-q1":"The first presentation begins at 9:30 A.M., and it will be held in Hall A.",
  "ig01-q2":"Yes. There is a session called Managing Your Time at 11:00 A.M. in Room 204.",
  "ig01-q3":"After lunch, there are two activities. The Customer Communication Workshop starts at 2:00 P.M., and the Networking Reception begins at 4:00 P.M.",
  "ig02-q1":"The earliest class is Yoga at 8:00 A.M., and it is taught by Maya Chen.",
  "ig02-q2":"If you are not a member, one class costs 12 dollars.",
  "ig02-q3":"You have two options with Maya Chen. She teaches Yoga at 8:00 A.M. and Pilates at 3:00 P.M.",
  "ig03-q1":"The festival is taking place at the Orion Arts Center, and the first event begins at 10:00 A.M.",
  "ig03-q2":"No, that is not correct. The director question-and-answer session begins at 12:00 P.M., not 1:00 P.M.",
  "ig03-q3":"From two o'clock onward, before the awards ceremony, you can attend the documentary at 2:30 P.M. and the international feature at 5:00 P.M.",
  "ig04-q1":"The trip to the airport usually takes about 45 minutes.",
  "ig04-q2":"The first shuttle to Terminal 2 leaves at 7:00 A.M.",
  "ig04-q3":"After eight in the morning, you can take the Terminal 1 shuttle at 8:30 A.M. or the one at 11:30 A.M.",
  "ig05-q1":"The least expensive class is Bread Basics, and it costs 35 dollars.",
  "ig05-q2":"The Korean Home Cooking class is on Tuesday at 7:00 P.M., and it is taught by Chef Kim.",
  "ig05-q3":"The only class that starts later than 7:00 P.M. is Thai Street Food on Thursday at 7:30 P.M.",
  "ig06-q1":"The Robotics Lab tour lasts 60 minutes.",
  "ig06-q2":"Yes. There is a Space Exploration tour in the afternoon at 2:30 P.M.",
  "ig06-q3":"There are two tours after 2:00 P.M. Space Exploration begins at 2:30 P.M., and the Robotics Lab tour begins at 4:00 P.M.",
  "ig07-q1":"Check-in starts at 5:30 P.M.",
  "ig07-q2":"If you buy a ticket at the door, it costs 90 dollars.",
  "ig07-q3":"Before dinner, check-in begins at 5:30, the keynote starts at 6:00, and the roundtable sessions begin at 6:45.",
  "ig08-q1":"The pronunciation workshop will be held in the Language Lab.",
  "ig08-q2":"No. The student presentations are optional, so they are not required.",
  "ig08-q3":"Before lunch, there are two activities: Conversation Skills at 9:00 and the Pronunciation Workshop at 10:30.",
  "ig09-q1":"Room D can hold the largest group. It has space for up to 12 people.",
  "ig09-q2":"You should reserve Room B. It is available at 11:00 A.M. and can accommodate six people.",
  "ig09-q3":"Two rooms are available in the afternoon. Room C holds six people and costs 20 dollars per hour, while Room D holds twelve people and costs 35 dollars per hour.",
  "ig10-q1":"The greenhouse tour begins at 10:00 A.M.",
  "ig10-q2":"Yes. Lunch is included in the ticket price.",
  "ig10-q3":"After lunch, there is a cooking demonstration at 2:00 P.M. and a farm shop visit at 3:30 P.M."
};

const opinionAnswers: Record<string,string> = {
  op01:"I think working in the office is better for most employees. First, communication is usually faster when coworkers can speak face to face. If a problem comes up, people can discuss it immediately instead of scheduling another online meeting. Second, the office makes it easier for new employees to learn from experienced coworkers. For example, they can ask quick questions and observe how the team works. Working from home can be convenient, but it can also make some people feel isolated. For these reasons, I think the office is the better arrangement for most employees. It also creates more opportunities for informal collaboration, which can strengthen relationships across the team.",
  op02:"I agree that university students should complete an internship before graduating. An internship gives students a chance to apply what they learned in class to a real workplace. It also helps them understand what kind of job they actually want. For example, a student who studies marketing may discover that they prefer data analysis after working on a real project. In addition, students can build professional skills such as communication and teamwork. Because an internship provides both practical experience and useful career information, I think it should be an important part of university education. It can also make students more confident when they begin applying for full-time positions after graduation.",
  op03:"I think opportunities to learn new skills are more important than a high salary, especially at the beginning of a career. New skills can help a person qualify for better jobs later, so they have long-term value. Also, learning makes work more interesting and can prevent employees from feeling stuck. For example, if a new employee learns project management and data analysis, those abilities may lead to promotions or new career options. Salary is definitely important, but it can change from job to job. Skills stay with you. Therefore, I would choose a job that offers strong learning opportunities. Over time, those abilities can also give employees more bargaining power when they negotiate future salaries.",
  op04:"I think cities should spend more money improving public transportation and roads before putting additional money into parks, but if I must choose between parks and roads, I would choose roads. Safe and well-maintained roads affect almost everyone, including drivers, buses, delivery workers, and emergency vehicles. Poor roads can cause accidents and increase travel time. For example, damaged streets near my neighborhood create traffic because cars have to slow down suddenly. Parks are valuable for quality of life, but transportation infrastructure supports daily activities for a larger number of people. For that reason, I think road improvements should receive more funding. Reliable roads can also help local businesses because deliveries and customer travel become faster and more predictable.",
  op05:"Yes, I think companies should give employees more flexible starting and finishing times. People have different schedules and responsibilities, so one fixed timetable is not always efficient. For example, a parent may need to take a child to school, while another employee may work better early in the morning. Flexible hours can reduce stress and may also help employees avoid the busiest commuting time. As long as team members are available for important meetings and complete their work, the exact starting time is not the most important thing. Therefore, I think flexible schedules can improve both productivity and employee satisfaction. This kind of flexibility can also help companies attract and keep talented employees with different personal needs.",
  op06:"I prefer to plan a vacation carefully in advance. Planning helps me use my time and money more efficiently. Popular hotels, trains, and attractions can sell out, so booking early gives me more choices and often better prices. Also, I do not want to spend half of my vacation deciding what to do next. For example, when I visited another city last year, I reserved the main attractions before I arrived, so I could relax and enjoy the trip. I still leave some free time for spontaneous activities, but overall I think advance planning makes a vacation less stressful. Having a basic plan also gives me confidence that I will not miss the activities that matter most to me.",
  op07:"Yes, I think buying from small local businesses can be a good choice even when prices are a little higher. Local businesses often provide more personal service and sell products that are different from those at large chains. Spending money locally can also support jobs in the community. For example, I sometimes buy coffee from a small café near my home because the staff know their customers and the quality is consistent. I would not pay a much higher price for every product, but when the difference is reasonable, I think supporting a good local business is worthwhile. It also helps create a more distinctive neighborhood because independent stores give an area its own character.",
  op08:"I think fairness is the most important quality a manager should have. Employees need to trust that decisions about schedules, responsibilities, and promotions are made consistently. If a manager is unfair, even strong communication skills will not create a healthy team. For example, if one employee is always given easier assignments because the manager likes that person, other team members may lose motivation. A fair manager listens to different viewpoints and applies the same standards to everyone. Technical knowledge and communication are also useful, but fairness creates trust, and trust is essential for a team to work well together. Employees are also more likely to speak honestly when they believe their manager will evaluate everyone by the same standards.",
  op09:"I disagree that students always learn more effectively in groups. I think studying alone is often better when a student needs deep concentration. People have different strengths and study speeds, so group sessions can become inefficient if everyone wants to focus on different topics. For example, before an exam I prefer to review difficult chapters by myself and spend extra time on the areas I do not understand. Group study is useful when students want to discuss ideas or practice explaining concepts, but for focused review and memorization, studying alone is more effective for me. The best approach may depend on the subject, but for serious individual review I would still choose studying alone.",
  op10:"I think providing additional training is a better way to improve employee performance than offering financial rewards. A bonus may motivate someone for a short time, but training improves the skills employees use every day. For example, if a customer-service team receives better communication training, they can solve problems more quickly and confidently. Employees may also feel that the company is investing in their professional development, which can increase motivation. Financial rewards are still useful for recognizing excellent work, but if a company wants long-term improvement, I think high-quality training has a stronger and more lasting effect. Better training can also reduce repeated mistakes, which saves the company time and money over the long term.",
  op11:"I prefer living close to my workplace even if the housing costs more. The biggest reason is time. A short commute gives me more time to sleep, exercise, or meet friends after work. It also reduces stress because I do not have to worry as much about traffic or transportation delays. For example, saving one hour of commuting every day adds up to many hours each month. Of course, I would still need to stay within my budget, so I would not choose an extremely expensive apartment. However, if the price difference is reasonable, I would pay more for a shorter commute. That extra time would improve my daily routine enough to justify a moderately higher monthly housing cost.",
  op12:"Yes, I think people should limit how much time they spend on social media each day. Social media is useful for communication and information, but it can easily take time away from more important activities. People may open an application for a few minutes and continue scrolling for an hour. For example, students who check their phones repeatedly while studying may have trouble concentrating. A reasonable daily limit can help people become more aware of their habits without requiring them to stop using social media completely. For that reason, I think setting a time limit is a healthy and practical idea. It can also encourage people to spend more time exercising, reading, or talking face to face with others.",
  op13:"I think the best way for a city to encourage public transportation is to make the service more frequent and reliable. People will not choose buses or trains if they often have to wait a long time or worry about arriving late. For example, if a bus comes every ten minutes instead of every thirty minutes, commuters can travel without planning their entire day around the timetable. The city can also provide accurate arrival information through an app. Lower prices may help too, but convenience is usually the main reason people decide whether public transportation can replace a private car. Once the service becomes dependable, more people may be willing to leave their cars at home regularly.",
  op14:"I agree that restaurants should provide more information about the ingredients in their food. The most important reason is safety. Customers may have allergies or dietary restrictions, and clear ingredient information can help them avoid serious problems. It also makes ordering easier for people who are vegetarian or who avoid certain foods for religious reasons. For example, a customer should not have to ask several employees just to find out whether a sauce contains nuts. Restaurants do not need to list every recipe in detail, but basic ingredient and allergy information would make dining safer and more convenient. Clear information can also build trust because customers feel that the restaurant is being transparent about what it serves.",
  op15:"I think speaking with other people is more valuable for learning a foreign language. Grammar and vocabulary are necessary, but learners need real conversation to turn that knowledge into a practical skill. When people speak, they have to choose words quickly, understand another person, and respond naturally. For example, I may understand a grammar rule perfectly in a textbook but still hesitate when I have to use it in a conversation. Speaking practice also helps learners notice which words or expressions they are missing. Therefore, I would spend more time communicating with other people while continuing some independent study. Regular conversation would make me more comfortable using the language in real situations outside the classroom as well.",
  op16:"I think employees who can do many different kinds of tasks are more valuable in most workplaces. Companies often face unexpected problems, so flexible employees can move between responsibilities when necessary. For example, a worker who understands both customer service and basic data analysis may help different teams during a busy project. These employees can also communicate across departments more easily. Specialized experts are extremely important for difficult technical work, so a company still needs them. However, for many everyday business situations, I think adaptable employees provide more flexibility and can contribute in a wider range of situations. That adaptability can be especially useful in smaller companies where one person may need to support several functions.",
  op17:"Yes, I think museums and cultural attractions should offer free admission to local residents, at least on certain days. Local residents support these institutions through taxes and contribute to the community around them, so giving them easier access seems reasonable. Free admission can also encourage families and students to visit more often. For example, a student might visit a museum several times for a school project instead of trying to see everything in one day. Museums still need revenue, so they could limit the program to local residents or specific days. Overall, I think the educational benefit makes the policy worthwhile. More frequent local visits could also strengthen residents’ connection to the history and culture of their own community.",
  op18:"I think the most effective way to maintain a healthy lifestyle with a busy schedule is to create small routines that are easy to repeat. People often fail when they make plans that require too much time. For example, instead of trying to exercise for two hours, a busy person can take a thirty-minute walk after dinner or prepare simple healthy meals for several days at once. Scheduling these activities in advance also helps. The goal should be consistency rather than perfection. Small habits may not seem impressive at first, but when people follow them every week, they can have a significant effect on long-term health. These routines are realistic even during stressful periods, which makes them easier to maintain for many years.",
  op19:"I think companies should spend more money improving customer service. Even an excellent product can lose customers if people have a bad experience when something goes wrong. Good customer service builds trust and can turn a problem into a positive experience. For example, if a customer receives a damaged product, a quick and polite replacement process may make that customer willing to buy from the company again. Product improvement is obviously important, especially in competitive industries, but customers judge a company by the entire experience. For that reason, I think strong customer service deserves more investment. Strong service can also create positive word of mouth, which helps a company keep existing customers and attract new ones.",
  op20:"I prefer smaller gatherings to large events. Small gatherings make it easier to have meaningful conversations because I can actually spend time with each person. They are also less stressful because I do not have to deal with large crowds, long lines, or very loud music. For example, I would rather have dinner with six close friends than attend a festival with thousands of people. Large events can be exciting, especially for concerts or special celebrations, but in my free time I usually want to relax and connect with people. That is why smaller gatherings are a better choice for me. Smaller gatherings also make planning easier because the group can choose a place and schedule that suits everyone."
};

function readHelp(q: Question): PracticeHelp {
  return {
    hint:"내용을 바꾸거나 요약하지 말고 화면의 지문을 그대로 읽으세요. 준비 시간에는 긴 문장을 의미 단위로 나누고, 숫자·고유명사·복합어를 먼저 확인하세요.",
    guideWords:["의미 단위로 끊기","내용어에 강세","쉼표에서 짧은 pause","문장 끝 억양","또렷한 자음"],
    structure:["1) 45초 동안 어려운 단어와 숫자 확인","2) / 로 끊어 읽을 위치 정하기","3) 핵심 명사·동사·형용사에 자연스러운 강세","4) 너무 빠르지 않게 끝까지 읽기"],
    sampleAnswer:q.passage ?? "",
    why:"이 유형은 답변의 아이디어를 평가하는 문제가 아닙니다. 공개 ETS 채점표는 발음의 이해 가능성과, 문맥에 맞는 강세·휴지·상승/하강 억양을 별도로 평가합니다. 따라서 원문을 정확히 전달하면서 자연스러운 리듬을 만드는 것이 핵심입니다.",
    officialFocus:["Pronunciation · 발음/이해 가능성","Intonation & stress · 억양과 강세"],
    coachNote:"모범답변은 별도 문장을 만드는 것이 아니라 화면의 지문 그 자체입니다. 연습 후 브라우저 음성으로 지문을 다시 들어보며 리듬을 비교하세요."
  };
}


function buildPictureSample(q: Question): string {
  const scene = typeof q.metadata.scene === "string" ? q.metadata.scene : "everyday place";
  const concepts = Array.isArray(q.metadata.concepts)
    ? (q.metadata.concepts as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const [a = "people", b = "objects", c = "activity", d = "the surroundings", e = "the background"] = concepts;
  return `This picture shows a ${scene}. The scene includes ${a}, ${b}, and ${c}. The people appear to be going about their usual activities, and ${d} is also visible nearby. In the background, I can see ${e}. The area looks fairly busy and organized. Overall, it seems like a typical scene at this place, and everyone appears to be focused on what they are doing.`;
}

function pictureHelp(q: Question): PracticeHelp {
  return {
    hint:"사진의 모든 것을 나열하려고 하지 마세요. 먼저 장소와 전체 장면을 한 문장으로 말한 뒤, 눈에 잘 보이는 사람 → 행동 → 사물/배경 순서로 4~6문장을 연결하면 안정적입니다.",
    guideWords:["This picture was taken…","In the foreground…","I can see…","appears to be ~ing","In the background…","Overall…"],
    structure:["1) 장소/전체 장면","2) 가장 눈에 띄는 사람과 행동","3) 주변 사람·사물","4) 배경/위치 표현","5) 전체 분위기 한 문장"],
    sampleAnswer:pictureAnswers[q.id] ?? buildPictureSample(q),
    why:"ETS의 최고점 설명은 사진의 주요 특징을 묘사하면서 전반적으로 이해 가능하고, 어휘와 문장 구조를 사용해 아이디어를 일관되게 표현하는 답변을 요구합니다. 그래서 단어만 나열하는 것보다 위치 표현과 동작 문장을 연결해 ‘장면’을 만들어 주는 방식이 유리합니다.",
    officialFocus:["주요 특징을 사진과 관련 있게 묘사","전반적인 이해 가능성","문법·어휘","Cohesion · 문장 간 연결"],
  };
}

function interviewHelp(q: Question): PracticeHelp {
  const slots = Array.isArray(q.metadata.slots) ? (q.metadata.slots as string[]) : [];
  const slotText = slots.map(s=>SLOT_KO[s] ?? s).join(" + ");
  return {
    hint:`질문이 요구한 요소를 빠뜨리지 않는 것이 먼저입니다${slotText ? `: 이 문제는 ${slotText}를 모두 포함해 보세요` : ""}. 15초 문제는 결론부터 2~3문장, 30초 문제는 결론 + 이유/예시까지 확장하세요.`,
    guideWords:q.responseSeconds >= 30 ? ["I think…","The main reason is…","For example…","Also…","That’s why…"] : ["Usually…","About…","I prefer… because…","Most often…"],
    structure:q.responseSeconds >= 30 ? ["1) 질문에 바로 답하기","2) 이유 설명","3) 구체적 예시/세부사항","4) 짧게 마무리"] : ["1) 질문에 바로 답하기","2) 필요한 세부정보 한 가지 추가"],
    sampleAnswer:interviewAnswers[q.id] ?? "I would answer the question directly first and then add one specific reason or detail.",
    why:"ETS는 Q5–10에서 ‘full, relevant, socially appropriate reply’를 높은 점수의 핵심으로 설명합니다. 즉 어려운 표현보다 질문에 정확히 답하고 필요한 정보를 완성하는 것이 우선입니다. 그 위에 자연스러운 전달, 적절한 어휘와 문장 구조가 더해집니다.",
    officialFocus:["Relevance · 질문과 직접 관련된 내용","Completeness · 요구 요소를 빠짐없이 답변","Delivery · 듣기 쉬운 전달","Vocabulary / structures · 적절한 어휘와 문장 구조"]
  };
}

function buildInfoSample(q: Question, facts: string[], fallback?: string): string {
  const rows = q.information?.rows ?? [];
  const normalize = (v:string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const factTokens = facts.flatMap(f => normalize(f).split(" ").filter(t => t.length > 2 || /\d/.test(t)));
  const matched = rows.filter(r => {
    const text = normalize(`${r.label} ${r.value}`);
    return factTokens.some(t => text.includes(t));
  });
  const unique = matched.filter((r, i, arr) => arr.findIndex(x => x.label === r.label && x.value === r.value) === i);
  if (unique.length) {
    if (q.responseSeconds >= 30) {
      const sentences = unique.slice(0, 4).map((r, i) => `${i === 0 ? "According to the schedule" : "After that"}, at ${r.label}, ${r.value.replace(/ — /g, " in ")}.`);
      return `${sentences.join(" ")} Those are the relevant activities listed in the information.`;
    }
    const r = unique[0];
    return `According to the information, the relevant item is at ${r.label}: ${r.value.replace(/ — /g, ", ")}.`;
  }
  if (fallback) return fallback;
  return `According to the information, ${facts.join(", ")}.`;
}

function infoHelp(q: Question): PracticeHelp {
  const facts = Array.isArray(q.metadata.expectedFacts) ? (q.metadata.expectedFacts as string[]) : [];
  return {
    hint:`표 전체를 다시 읽지 말고 질문의 키워드를 먼저 잡으세요. 현재 답변에서 찾아야 할 핵심 정보는 ${facts.length ? facts.map(()=>"●").join(" ") : "표의 관련 항목"} ${facts.length}개입니다. 시간·장소·가격·이름을 말할 때는 표의 정보를 정확하게 전달하세요.`,
    guideWords:["According to the schedule…","It starts at…","It will be held…","Yes, there is…","No, that’s not correct…","There are two…"],
    structure:facts.length > 1 ? ["1) 질문의 조건 확인","2) 조건에 맞는 항목 전부 찾기","3) 시간/장소/가격 등 필요한 정보 함께 말하기","4) 목록을 자연스러운 문장으로 변환"] : ["1) 질문 키워드 확인","2) 정확한 항목 찾기","3) 한 문장으로 자연스럽게 전달"],
    sampleAnswer:buildInfoSample(q, facts, infoAnswers[q.id]),
    why:"ETS 공개 채점표는 이 유형에서 제공 자료의 정보가 ‘accurate’해야 한다고 명시합니다. 또한 표의 문구를 그대로 읽는 것만으로는 부족할 수 있고, 듣는 사람이 이해하기 쉬운 말로 바꾸어 전달해야 합니다. 특히 Q10처럼 여러 항목을 묻는 문제는 조건에 맞는 정보를 빠짐없이 묶어 말하는 것이 중요합니다.",
    officialFocus:["제공 정보의 정확성","질문에 대한 완전한 답변","관련/불필요 정보 구분","표의 문구를 자연스러운 구어 문장으로 변환","전달력·어휘·문장 구조"]
  };
}

function opinionHelp(q: Question): PracticeHelp {
  return {
    hint:"45초 준비 시간에 완성 문장을 쓰려 하지 말고 ‘내 입장 / 이유 1 / 예시 / 이유 2’ 네 개의 키워드만 정하세요. 60초 답변에서는 입장을 첫 문장에 분명히 밝히는 것이 가장 안전합니다.",
    guideWords:["In my opinion…","First…","The main reason is…","For example…","In addition…","For these reasons…"],
    structure:["1) 입장 명확히 제시","2) 이유 1 설명","3) 구체적 예시/경험","4) 이유 2 또는 추가 설명","5) 입장 재확인"],
    sampleAnswer:opinionAnswers[q.id] ?? "In my opinion, I would choose one side clearly. First, I would explain my main reason and give a specific example. I would then add a second supporting point and finish by restating my position.",
    why:"ETS의 Q11 최고점 기준은 선택/의견이 분명하고, 이유·세부사항·논거 또는 예시로 충분히 뒷받침되며, 아이디어 사이의 관계가 명확한 답변을 요구합니다. 전달은 대체로 자연스럽고 명료해야 하며, 기본·복합 문장 구조와 효과적인 어휘 사용도 평가됩니다. 그래서 ‘의견만 길게 반복’하는 것보다 이유와 구체적 예시로 발전시키는 것이 중요합니다.",
    officialFocus:["명확한 choice/opinion","Reasons, details, arguments, examples","아이디어 간 명확한 연결","명료하고 적절한 속도의 전달","문법 통제","효과적인 어휘"]
  };
}

export function getPracticeHelp(q: Question): PracticeHelp {
  if(q.taskType === "read_aloud") return readHelp(q);
  if(q.taskType === "describe_picture") return pictureHelp(q);
  if(q.taskType === "respond_questions") return interviewHelp(q);
  if(q.taskType === "info_response") return infoHelp(q);
  return opinionHelp(q);
}

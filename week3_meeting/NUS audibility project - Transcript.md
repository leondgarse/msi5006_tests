Aug 28, 2026

## **NUS audibility project \- Transcript**

### **00:00:17**

**Josh Kettlewell:** Good morning. Hello. Can you hear me?

**Zhuchao Li:** Yeah.

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** Hey, I think Oh,

**Zhuchao Li:** Yeah.

**Josh Kettlewell:** we got more people.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** Good. Here we go. So, we've got we've got a guest lecturer today.

**Ulf Bissbort:** Hey Josh.

**Josh Kettlewell:** Hey,

**Ulf Bissbort:** Hi

**Josh Kettlewell:** um so just Yeah, we got everyone.

**Ulf Bissbort:** everyone.

**Josh Kettlewell:** So, let's kind of go through or just introduce everyone. You all know me, so I won't introduce myself. Um on the call today we've got Zhuchao from Shanghai. He works in pre-sales solutioning or technical pre-sales at Staple. Um so he's been working on um MSD when explaining it to clients.

**Ulf Bissbort:** Cool.

**Josh Kettlewell:** Um together on the call we have uh Leon and Lamphare. I always I always feel like I'm pronouncing the name wrong. Apologies Lamphare. Um students at NUS who are Oh, sorry. any yeah you are full-time you're part-time students at NUS full-time students we always forget on these

### **00:01:33**

**leon.D. Garse:** Oh, we don't do

**Lamphare:** fulltime

**Josh Kettlewell:** courses students um NUS and they're

**leon.D. Garse:** that.

**Lamphare:** students.

**Josh Kettlewell:** working uh with staple on uh the audit auditability of AI so specifically we're looking at MSD we're looking at CPA and how to integrate staple and how we can have good go to market motion around MST generally you know getting out to people telling spreading the good word on day is Ulf is the primary uh creator of MSD.

**Ulf Bissbort:** Well,

**Josh Kettlewell:** Um he is the so Dr.

**Ulf Bissbort:** the the code together the concept, right?

**Josh Kettlewell:** Bissbort of MIT and SUTD previously. So um what we wanted to go through today is the research we've done about C2PA um what it can do which was we found out which is really interesting about adding um additional data to the payload. Then we'll look at what what exists in MSD that maybe doesn't exist in CCPA and then we'll have just an open discussion about you know pros and cons of the two schemes. So yeah uh Leon in that case I think it may be over to you.

### **00:02:48**

**leon.D. Garse:** Okay. Wait a sec. Wait a sec. What's going on? stopped right I'm just trying to maybe window okay just this one so if we start from sports here report Yeah. What's going on the page?

**Josh Kettlewell:** Your internet is struggling I think. There we go.

**leon.D. Garse:** So um this is what we found in last week that C2P we test the C2P capacity we whether it can customer data customer data and whether it sports so many different file types. For the first one if we can custom JSON um so for the first for the first week we found that C2P can embed it with custom JSON. So this week we testing is the capacity of the supportation. So our founding that it has no data size limitation. We embedded this large JSON into a single image and the the format is not limited. Everything can be read in there and extracted correctly. And with a with a second question for which file types um by now our test show that it support only media one like images, audios and video and this also writen in their in their in C2PA to their readmi and the PDF file is not supported for writ but can relate some PDF files that have has been signed by them And this so the capacity of the PDF can be supported for baton but

### **00:05:12**

**leon.D. Garse:** the tool itself is not supported and for other format like the doc x and the word one is not all are all not supported. So this is the entire things for what we test here. Um uh yeah this a custom JSON file and uh uh so so so so it is a validation and but the it has a limitation here that for the J file you have to serialize it before written to the file. So like if a number string it uh it is not it for this one. Um if if there's a number string like uh ding box co bunny box do boxes it will be the number will be invalid like this one the one will be invalid and a is still valid um so another type the f types and this is what we tested for other uh for other side um this is the conclusion just the site itself in a limit limitation. So, so the file type is current limitation and we can consider if we if we insist on persist on MCD or or implement the PDF support by ourselves.

### **00:06:43**

**leon.D. Garse:** So, uh this is the yeah yeah this is the industrial tools. So everything that is supported by the m labs. So all the open AI atropic is all supporting it. So uh I tested with the gimminus generated image it has already signed by Google itself and we can extract the signature from it. And for the upper stream from uh this one is a PDF writing one. There are many issues and PR already in their GitHub page but uh um but uh in some years ago they have responded that it's still planned but is still not supported and Ben there are some PR trying to support the PDF writon using the low PDF.

**Josh Kettlewell:** I'm guessing those are blocked. And the reason they're blocked is because Adobe owns the PDF format and Adobee's part

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** of CTPA.

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** So I reck it sounds like they're purposefully blocking it from what I'm reading there. Carry on.

**leon.D. Garse:** Okay see so that that's the limitation and uh so later I asked the question uh I tried if we can support it by ourselves.

### **00:08:09**

**leon.D. Garse:** Yeah, this see it completely PDF ourselves if just it told that low PDF can be is already uh uh dependency for the for this tool but is not supported for so I think can be implemented uh this MSD comparison so for the uh I just another one another point is for the serialized JSON and deter that uh uh I think it should be supported. So we can just solve the see the see the tests. This is a runable IP file. We with all our tests

**Josh Kettlewell:** Oh, that's interesting. So, what here you're doing you're doing two orders and Oh,

**leon.D. Garse:** okay.

**Josh Kettlewell:** and the second order always destroys the first order. Okay, that's that's expected.

**leon.D. Garse:** Yeah. Okay. Okay. Uh this is showing the the extracted PDF.

**Josh Kettlewell:** Yeah,

**leon.D. Garse:** Oh, what is this? This extracted PDF signature part. So reflection

**Josh Kettlewell:** sorry. I'm I'm still seeing the not your notion.

### **00:09:30**

**leon.D. Garse:** not I

**Josh Kettlewell:** Are you sharing your whole

**leon.D. Garse:** understand.

**Josh Kettlewell:** screen?

**leon.D. Garse:** So we need

**Josh Kettlewell:** So, this is already kind of interesting because there's actually mult multiple issues with TTPA here.

**leon.D. Garse:** Yeah. Yeah.

**Josh Kettlewell:** Firstly,

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** not supporting generic file types is bad,

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** but it seems fixable on their side.

**leon.D. Garse:** Yeah. Yeah.

**Josh Kettlewell:** Whether they want whether they want to control that is weird.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** It's weirdly not as open a standard as they make it sound. Then the other one is

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** um the fact it corrupts data in certain cases is pretty bad. Um that's that's difficult. Um and yeah, those are those are pretty big big things just for doing it.

**leon.D. Garse:** Yeah. Yeah.

**Josh Kettlewell:** The the problem though is the fact the fact that it's already integrated cross

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** platform in some ways.

### **00:10:38**

**Josh Kettlewell:** You know, you generate it on claude but it's it's checked by YouTube that or you generate a video in seed dance and it's flagged by Instagram. That the fact that they've got everyone signed up to that is nice. I'll be honest there. That's a good little thing and it means that they'll continue to push that standard.

**leon.D. Garse:** You'll

**Josh Kettlewell:** Um, sorry, this is really interesting. Um,

**leon.D. Garse:** keep

**Josh Kettlewell:** what Leon, um, any any any comments before we continue? Uh,

**Ulf Bissbort:** Um,

**Josh Kettlewell:** Ulf

**Ulf Bissbort:** not really. Uh, I feel like yeah, if if it's if this is already used by YouTube and Google and so on, it's I mean it's kind of like an established standard already, right? Like it's going to be impossible to displace there. Um the the one thing I would distinguish still I think where we're maybe lacking a bit of clarity is like the initial version of MSD and like the also how it's implemented is like the embedding into existing file types is orthogonal to the signing and the existence of metadata and so on right so um from the outside of course we you can claim we support like more file types now with all the Excel and and word and PDF and what's and whatnot.

### **00:11:54**

**Ulf Bissbort:** Um I think in terms of enterprises like There's two different things. You may have like a complete database in your enterprise where you track everything that goes through a certain system, sign it from the outside and keep track of that, right? So the file itself does not know whether it was signed or not or which metadata is known about it. And then there is can you embed that information into it, right? Like C C2PA is purely about the second part that you embedded in there. Um, so I would just I would recommend that we kind of distinguish the two parts,

**Lamphare:** Okay.

**Ulf Bissbort:** right? Because of course like with MSSE like you can give it arbitrary bites, right? Like you can give give it whatever data type you want of the many supported ones. Um, so uh the the question is really are we going to focus purely on what is embeddible or

**Lamphare:** Sweet.

**Ulf Bissbort:** not? Are we going to focus on like the the bigger picture as well?

**leon.D. Garse:** Yeah,

### **00:12:50**

**Josh Kettlewell:** Let

**leon.D. Garse:** that's a decision we need to we need to

**Ulf Bissbort:** Yeah.

**leon.D. Garse:** make.

**Ulf Bissbort:** because they're not the same thing, right? I just uh just just to make that clear. Yeah.

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** let's let's continue. We'll go through the experiment first and then we'll talk about this interlinkability because I think it's the best way to go for it. Go continue Leon. You're going to continue showing experiment.

**Lamphare:** Thanks.

**Josh Kettlewell:** What was

**leon.D. Garse:** in development.

**Josh Kettlewell:** that?

**leon.D. Garse:** Uh the IPL

**Josh Kettlewell:** If you want to if you think it's if you think there's anything else to see from

**leon.D. Garse:** it just showing some some verified file format like uh this real

**Josh Kettlewell:** that.

**leon.D. Garse:** signatures thing. Oh, why is it so laggy?

**Josh Kettlewell:** So, okay.

**leon.D. Garse:** Yeah, this is the the PDF one from downloaded at all PDF and this is what he signed the extracted things fails. So is what he done and a Gemini image.

### **00:14:04**

**leon.D. Garse:** The Gemini image where the Gemini image we went. Yeah, this one just what Google has signed for just these two parts. So this is just showing these two parts if you want to run

**Josh Kettlewell:** Okay. Um,

**leon.D. Garse:** this P file and it's in my GitHub if you need.

**Josh Kettlewell:** okay. You're just you're here.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** You're just showing that you can encode into CTPA and you can unpack and then and Google's doing it with Gemini images.

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** Those are fat. That's fine. Um,

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** okay. Well done. First, this is really good work. Like top stuff.

**leon.D. Garse:** Thank

**Josh Kettlewell:** Um, like 10 out of 10 wonderful work.

**leon.D. Garse:** you.

**Josh Kettlewell:** um and already in the project. This is really good research.

**leon.D. Garse:** Yeah. A soul from We just can get these conclusions but this year is on your side. for our little where we go this project and the lampair

### **00:15:08**

**Josh Kettlewell:** Yeah.

**leon.D. Garse:** and James for their work. We need

**Josh Kettlewell:** Okay. Cool. Um, in that case, Lan,

**leon.D. Garse:** your

**Josh Kettlewell:** do you is there anything that you want to go through or discuss to continue or shall we break open the conversation?

**Lamphare:** Uh hi. Can can you hear me?

**Josh Kettlewell:** Yes, we

**Lamphare:** Okay. Uh actually I I if I can uh uh speak in Chinese because I also do some relative research but those professional vocabulary. Yeah, maybe I can speak in Chinese in uh to express more

**Josh Kettlewell:** That's fine. Me and Ulf will not understand,

**Lamphare:** accurately.

**Josh Kettlewell:** but Zhuchao will. The blue showers continue watching

**Lamphare:** Oh okay. Okay.

**Zhuchao Li:** Oh, should

**leon.D. Garse:** Do you need to share? Okay.

**Lamphare:** I need to share the screen but I just do a a little research because now the stage I think for the most important thing that we should do the technical validation. Uh but I find another interesting related uh MSD uh is visa tap visas tap ch agent uh protocol.

### **00:16:51**

**Lamphare:** Oh here uh I

**leon.D. Garse:** You sharing.

**Lamphare:** I try my my my computer is very slow. Sorry.

**Zhuchao Li:** and you know Apple will release a new new version of the Mac considering to

**Lamphare:** Oh,

**leon.D. Garse:** Easy.

**Zhuchao Li:** buy it.

**Lamphare:** or or maybe given can you help to or you share for your site and you can kick off the uh uh open the link in our uh project output week two and I I share a link in there.

**leon.D. Garse:** Okay.

**Lamphare:** You can help

**leon.D. Garse:** uh with like this one.

**Lamphare:** me.

**leon.D. Garse:** Yeah, I have opened too many tubs. So, I need to close them.

**Lamphare:** Okay, maybe I will try

**leon.D. Garse:** Uh where where is your

**Lamphare:** Uh, week two.

**leon.D. Garse:** but is only mine?

**Lamphare:** No, I I put

**leon.D. Garse:** I think see

**Lamphare:** uh Uh w week two in in in in the top in the top link.

**leon.D. Garse:** This one. Oh, this

**Lamphare:** Yeah.

**leon.D. Garse:** one. Yep.

**Lamphare:** Oh, okay.

### **00:18:47**

**Lamphare:** Now, now I have to transfer to Chinese layer. use case. Agent AI agent. forchech. Agent agent chest layer.

**leon.D. Garse:** Do you get it?

**Lamphare:** Oh,

**Josh Kettlewell:** Yeah, I'm going to need your help, Z, because I didn't c I didn't catch any of that. And I don't think did

**leon.D. Garse:** Uh just another another verification protocol I think is a

**Josh Kettlewell:** either.

**leon.D. Garse:** PTP1 applied by visa is Yeah.

**Zhuchao Li:** Yeah.

**Josh Kettlewell:** I I see I see

**Zhuchao Li:** Yeah.

**leon.D. Garse:** Yeah.

**Zhuchao Li:** Just she she found another uh protocol which is provided by Visa

**leon.D. Garse:** Yeah. Yeah.

**Josh Kettlewell:** the

**leon.D. Garse:** Yeah.

**Zhuchao Li:** and the background she found is that this protocol may maybe folks to to to verify because in their uh their business some of the AI agent already on behalf their uh their clients to make the transaction. So this is uh this protocol as she found that there many folks on to verify if the this agent to be trusted to on behalf of their uh their clients to to make make the the transaction and uh another uh another is that this proto to to uh to help to guide the agent to to to stand their their behaviors something like that.

### **00:22:57**

**Zhuchao Li:** So uh so I think she's just uh considering maybe this could be uh for a reference for for for the MSD especially the MSD content or the the purpose or the how the our you uh end user to use the MSD. Yeah.

**Lamphare:** Yeah.

**Zhuchao Li:** To extend maybe to extend the user scenarios of the MSD something like that.

**Lamphare:** Maybe.

**Josh Kettlewell:** That's very

**Zhuchao Li:** Yeah.

**Lamphare:** Yeah. Yeah.

**Zhuchao Li:** Mhm.

**Lamphare:** I feel it's very interesting because uh uh in in Visa's case maybe the the

**Josh Kettlewell:** interesting.

**Lamphare:** user uh the the product user is not only limited to the human but also expand to AI agent. So I feel it's broad my horizon.

**Josh Kettlewell:** This is what MSSE should be used like.

**Lamphare:** Yeah.

**Josh Kettlewell:** It doesn't matter who should be using a protocol if it's if it's implemented by an automated flow um in staple or if it's done by a human action of signing. Um they should both be equally applicable. Um this is interesting. Um but firstly again. Well done. Um, love Leon.

### **00:24:03**

**Josh Kettlewell:** This is good work. Um, I hope you're enjoying this and learning a lot. It seems seems so. Um, so if it's okay, I'm going to um ask you ask you to expand on these because I' I'd really be interested to hear your thoughts about this. My major concerns are um CTP being well established and whether that is a threat but mostly it's being used for verification is something was made by something but it could be expanded in the future. That's a worry. Um the other the other um thing is you know if you only got if the person receives only a single file that file

**leon.D. Garse:** Mhm.

**Josh Kettlewell:** would contain maybe some data and some context. You know MSSE has some other uh parts about interlinkability between files but if the person only receives one file there's no advantage there because they just have to trust the lock essentially.

**leon.D. Garse:** Um,

**Josh Kettlewell:** Um,

**leon.D. Garse:** okay.

**Josh Kettlewell:** you go for it, Liam.

**leon.D. Garse:** Yeah. Yeah.

**Josh Kettlewell:** Yeah.

### **00:25:09**

**Josh Kettlewell:** Cool. So, Ulf,

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** let's wax poetic for us and see your thoughts.

**Ulf Bissbort:** So, so I think like in terms of tooling like number one obvious just to get the obvious out of the way the the the Excel sheets and PDF support and DOCX support I think if people are emailing files around that that is critical right um if they so to your question if they receive a file and it's signed and it says like hey this file was verified that the photo was made by X or something or like the the data was inserted um from this source and I'm signing off on that. Um well, number one, there's the thing with how do you look up who signed that and are they in the your network of trust, right? Like how does C2PA do that actually or like so suppose I were to get a file and I want to see like do I trust this as I'm working in some enterprise, right? Somebody sending me a receipt or like some Excel file. What are the tools that C2PA would provide of how I could look up easily like can I trust this given the rules of my enterprise?

### **00:26:21**

**Ulf Bissbort:** It's my first

**Josh Kettlewell:** So,

**Ulf Bissbort:** question.

**Josh Kettlewell:** how is there is there a public key or something else?

**leon.D. Garse:** Yes.

**Josh Kettlewell:** And how do we know that just because C2PA says Google LLC, was it really Google LLC? How know? That's a great question. Um, yeah. How like does it point to does it have an email where it points to a a public key or something? But then that that would that would work, you know, is there a pointer? You know, I I go to an address, I I can read the public key, so I know that whoever signed it must have the corresponding private That would be one way that it could do it. Does it do it? That's very easy to check. All you have to do is find any document generated by Gemini, read the CTPA data, and does it have any way of saying in there, apart from the fact it says made by Google, does it have anything else?

**leon.D. Garse:** I have a try if we can.

### **00:27:23**

**Josh Kettlewell:** You can look right now. If you can look at the payload,

**leon.D. Garse:** Yes.

**Josh Kettlewell:** you can find we can find that out.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** While you're doing that, continue Ulf.

**Ulf Bissbort:** All right.

**leon.D. Garse:** I mean uh image

**Ulf Bissbort:** Um the the second one I think is if you if I'm a if I'm a worker at like some big company, right? Like I'm not I'm I'm going to be complying with whatever needs to be done in terms of signing off and so on, right? But like I'm not going to go out of my way if I don't have to. I'm going to do the bare minimum. So, if everybody's going to be asked like any any email that you receive with an Excel document, are people going to open Python or some tool and look at the metadata and make a note? Um, I think that's too high of an effort, right? I think investing in the tooling for in whichever form it will be used or we want it to be used to make that kind of happen under the hood is um that is essential if you want it to be adopted.

### **00:28:17**

**Ulf Bissbort:** and also for enterprises to actually use it in their everyday workers workflow, right? Because if it's going to reduce productivity by 20%, I don't see anybody using that until unless it's really mandated with with big uh with big fines or something, right? Um so the question being like you receive an email or what in whichever form you get data number one, what are the rules of the company because who can I trust, right? like who's in the trusted like is it within the company you may have rogue employees do you have a system for withdrawing keys all of that I think is essential um but also the other customers um you may be working with right like you as an enterprise you may want to set up declarative laws or rules of who you trust and where you see verification and set up this build the tooling around that that makes it very easy to either drag it into the system or you're only working within the system and it kind of automatically have a you have the green check marks whatever and if anything is off it warns you and it refuses to do things right.

### **00:29:20**

**Ulf Bissbort:** Um so I think that is essential. Um any shall we discuss that first or shall I

**Josh Kettlewell:** Well, um, yes,

**Ulf Bissbort:** move?

**Josh Kettlewell:** get it getting something in place where stuff refuses and makes people do things is great, but I feel like there's there's a lot of steps missing before getting there.

**Ulf Bissbort:** Is

**Josh Kettlewell:** I don't know.

**Ulf Bissbort:** it

**Josh Kettlewell:** There's no none of these. MSD is not anywhere right now. It's in staple.

**Ulf Bissbort:** right?

**Josh Kettlewell:** That's that's the issue.

**Ulf Bissbort:** Right.

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** So I agree that that's a better thing to get to and it's often but my worry is bridging the

**Ulf Bissbort:** All right. But I'm just saying we have the like we had the working prototype from before when it was called not

**Josh Kettlewell:** gap.

**Ulf Bissbort:** MSD. You remember which actually showed that to you that that can be adapted uh and tools like that can be built with like if the need is there we can

**Josh Kettlewell:** Yes.

**Ulf Bissbort:** build those tools right like um I I I would want a bit more clarity on how it is being used before I invest a large amount of time though.

### **00:30:19**

**Josh Kettlewell:** Yeah.

**Ulf Bissbort:** Yeah.

**Josh Kettlewell:** Okay. Um, continue. I know one

**Ulf Bissbort:** Um yeah so I guess in the finance industry like one big thing is

**Josh Kettlewell:** thing.

**leon.D. Garse:** Okay.

**Ulf Bissbort:** like for auditability and reports right like there is a source of the data where it enters the digital world in some form if you're doing it for food panda it may be the delivery driver who takes a picture of some physical scribbled receipt or whatever it is right um so you essentially have root nodes to your trust network and they are signed off by like in that case that driver says they took a picture of that their geoloccation added blah blah blah. Um, and then you may have derived data, right? So maybe those reports are collected, they go through your staple system. How do I know if I look at some Excel sheet that shows me the quarterly earnings? Um, can I easily figure out like which numbers went in there? Right? Like other than trust me, bro.

### **00:31:19**

**Ulf Bissbort:** Um and for that you need you you need like this dependency tracking in a system if you want to make that automatic and easy in a sense right

**Josh Kettlewell:** This this is the case but it applies to internal systems which are using MSD

**Ulf Bissbort:** um

**Josh Kettlewell:** continuously throughout their process. At the moment where we're looking at the systems being implemented is between two people I inside something and send it to you.

**Ulf Bissbort:** H no no no

**Josh Kettlewell:** what you're talking about is within a within a company itself and you can

**Ulf Bissbort:** no no I'm that that's the bigger misunderstanding Josh the core part of the design like the core of

**Josh Kettlewell:** can okay

**Ulf Bissbort:** MSD point number one is the design is that you

**Josh Kettlewell:** maybe

**Ulf Bissbort:** can always do that and you can add that you can add the metadata later and it'll all make sense once it

**Zhuchao Li:** Okay.

**Ulf Bissbort:** pops into place right so somebody else can sign it and you can get it later you can query or like the auditor 5 years later can be like hey I need this and the other company had it and and by um and a court case rules they have to they have to show that data right then the system like you just you add it and it tells you like which things are verified which ones are not right like so it's completely orthogonal

### **00:32:29**

**Josh Kettlewell:** So let's for example let me let me put this in the layman language. I I do some processing you know I'm stable I just processing. I've got some do ID cards, some passports and whatever and I make a loan document and I go and give it to you who who a bank and at the moment what we're doing OSD is we've got a log of you know this is what I did trust me bro it's signed and it goes over to you and you you can see that Yes, they do sign it. This is all the history and it's actually very useful already. But there's still an element of trust me, bro. Here's what Staple did according to Staples logs. Um, fine. You're saying that the big advantage here is that if the bank goes,"Yes, I see the logs, but I don't trust you, bro. Can you give me those files to show that that's is actually what happened and it's not just log data that's written as a payload. it's at here's the files and show that these things actually happened is is the

### **00:33:33**

**Ulf Bissbort:** Exactly.

**Josh Kettlewell:** yeah that is a very big thing and

**Ulf Bissbort:** Exactly. And you don't have to give out all your logs,

**Josh Kettlewell:** it

**Ulf Bissbort:** right? It's you can give out only the parts that apply to that customer and that will fit into their bigger picture or that auditor asks for it. Right? Um you can also make a bigger network where certain companies can up like you kind of you kind of whether you want to expose it by queries if that is required or not or in which parts or do you only verify and you put your stamp on and if the auditure comes you have to be able to prove that. There are a lot of ways of how you can engineer the systems around that in a sense, right? But that is at the core of you can expose the parts only and it kind of keeps this graph of everything that depended on it and it will also be verifiable later on. Right?

**Josh Kettlewell:** Okay. Um, that makes a lot of sense.

### **00:34:33**

**Josh Kettlewell:** The applications are specific to it. then it comes a lot more into aspects of if you're doing it internally and you're tracking things internally the business makes a lot of sense or if it's if you've documents bounding between businesses and there's an element of distrust later where you want to audit what really happened so we all agree there's big advantages in MSD I well I I personally can state that office of course of that opinion um the question is then we need to be able to state these advantages very succinctly to people because and that's very very hard. Um we also need to decide if CTPA is extensible is it actually a threat to MSD or should they be considered as parallel things? Um, and if they are, if it is slightly a threat, maybe you do want to go and maybe publicly trash CTPA and say everyone hates Adobe. This is closed source. You know, look at all these big tech monopolies taking over everything. And that's probably got got quite a bit of grassroots traction.

### **00:35:51**

**Josh Kettlewell:** If you start saying that and you spread it all over Twitter and Reddit, you know, suddenly MSD becomes a good standard as open source which might be interesting.

**Ulf Bissbort:** Are they actually treading that much on each other's feet?

**Josh Kettlewell:** Um

**Ulf Bissbort:** because like where I don't see if you're an auditor or you're a bank and you want to comply with like auditability and and where did the data come from if you don't have an answer to the provenence tracking and this is just a question I don't I haven't read enough about C2PA and it was clear to me from the presentation can you actually if if if I create an Excel sheet and I'm like these are for Excel it's very right like it's a It's a programming language where you put expressions. If you update the sources, the the cells and so on update. Um, conceptually you can you can think of any report generation like a big Excel sheet. There's computation on input data and then there's output, right? So with MSD in principle, if you were to put the stamp on like okay, we used this kind of calculation for calculating the quarterly report.

### **00:36:56**

**Ulf Bissbort:** This is the data that came in. There's no way of fudging anything. um if if that is the input data that was also signed by MSD right so in in a financial world my the question I want to get at is is there even sufficient overlap to be really worried about it because to me it still seems like it's extremely different

**Josh Kettlewell:** possibly and that's where it comes into can we distinctly

**Ulf Bissbort:** domains

**Josh Kettlewell:** say the advantages that people understand because people will think oh tracking audibility files here's what Google's just done they'll find CTPA and then they'll go there's a standard that sort of some parts of this and whatever they're not they're not as technical as we are and we'll there. So that's these are the two parts I'd say now. Um I mean internet's having some problem. Can you hear me? Okay. Okay.

**Lamphare:** Yes.

**Josh Kettlewell:** Um so I think that would be the next thing to think through. I'm very late for my next call.

**Ulf Bissbort:** All

**Josh Kettlewell:** So I think we should probably book an hour in the future.

### **00:38:03**

**Josh Kettlewell:** But um Leon, I've put some comments in the thing. So questions,

**Ulf Bissbort:** right.

**Josh Kettlewell:** can how do you confirm who really signed a CT ctpa?

**leon.D. Garse:** Hey,

**Josh Kettlewell:** You know, how do how do you know it's just not me pretending to be Google? Um then can we look closer at MSD and look at this

**leon.D. Garse:** you

**Josh Kettlewell:** interlinkability? Can we describe the advantages of that in a succinct way that people can engage with clearly? Um those would be the next two and depending on uh these things talks about our plan of action. It sounds like MC has still some big advantages and I do agree but then then our path would change. It would be do we put this in almost competition to uh TTPA and think about ways to go against it or do we really ignore it and say it's a parallel track. Um so that would be the the next

**leon.D. Garse:** Um but this questions for the signature CTP and the verification or

**Josh Kettlewell:** interesting

### **00:39:15**

**leon.D. Garse:** who sent it and if it's trusted and it it provide the website for verifying that and for and it has a log of the metadata of who activated it what and it can be all truncated through the history of Yeah. Yeah. It has a lock and one second.

**Josh Kettlewell:** The first one is how do you know it's really Google?

**leon.D. Garse:** Uh

**Josh Kettlewell:** Like can you see the public key?

**leon.D. Garse:** yeah, yeah. Yeah, we can see the public

**Josh Kettlewell:** How do you how do you find that public that thing?

**leon.D. Garse:** key.

**Josh Kettlewell:** So that's the first one. Then look at um state look at MSD find the look at the interlinkability.

**leon.D. Garse:** Mhm.

**Josh Kettlewell:** It's not just logs. It's actually a link between files if you do MSD across

**leon.D. Garse:** Yeah. I think for that part and the post custom JSON fail we can do what

**Josh Kettlewell:** multiple.

**leon.D. Garse:** MSID do in here

**Josh Kettlewell:** So I didn't get you

### **00:40:09**

**leon.D. Garse:** right if we can do that the MSD when we can add

**Josh Kettlewell:** there.

**leon.D. Garse:** those data in the C2P JSON for tracking of who edit of the source files Right.

**Josh Kettlewell:** Uh so so I think have a look at MSD because there's a way that you can link across files with MSD how one one process one file linked to the next one

**leon.D. Garse:** Yeah,

**Josh Kettlewell:** linked to the next one that that's the point that we want to differentiate

**leon.D. Garse:** I know. I know.

**Josh Kettlewell:** that against CTPa now um and it might not be possible CTPA looks like it has a lot of issues with um uh data being lost or corrupted or stuff. So that might be an issue. Let's think think about those and then think, hey, is it separate? Is it a competitor? And then we kind of move forward after that.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** Um, cool.

**Ulf Bissbort:** Okay.

**leon.D. Garse:** uh so uh there's we have other experiment about if we can use those both of the C2P and MSD parallel and the experiment so that we can do

### **00:41:15**

**Josh Kettlewell:** Sure,

**leon.D. Garse:** that.

**Josh Kettlewell:** you could try saying if you'd use them both together. Like that's an interesting one because if if they're if you have to make a choice on a document,

**leon.D. Garse:** Yeah.

**Josh Kettlewell:** do I use CTPA or do I use MSD? That could present a problem in some cases in the future as well.

**Ulf Bissbort:** All

**leon.D. Garse:** Mhm.

**Josh Kettlewell:** if it becomes a gem, if one of them becomes a CTP becomes a more uh pushed standard, even if it's worse, that could be a problem. So that from what I'd imagine, you can't do both. The latest one, latest one will always um

**Ulf Bissbort:** right.

**leon.D. Garse:** I'm going to

**Ulf Bissbort:** Okay. Um maybe two closing remarks very shortly like for the next time we meet. Uh what would help me? Number one is um if we could have a clear description of how you want like what is the primary one or two customer problems you are envisioning at the moment for to be solved right like how how do you want them to use MSD other than just verifying that like oh came from staple I put it in there and it came from staple yes fine.

### **00:42:26**

**Ulf Bissbort:** Um right. So can can we come up with a clear coherent vision that which is going to be the pitch or something like this is why you should use it regulation is coming here or like this blah blah blah you have auditability whatever the pitch is that that would be great.

**Josh Kettlewell:** I'll send some videos.

**Ulf Bissbort:** Um yeah,

**Josh Kettlewell:** I've got I've got some on that.

**Ulf Bissbort:** and the second point is I'm I think it's a um I think it's too hard of an ask to how are we going to describe this clearly to users because if they're nontechnical like yada yada yada like links across files and not include blah blah blah like nobody's going to care. They're not going to understand it. They're not going to care. I'm pretty sure about that. Um the only way forward I think is to actually show with tooling and show scenarios and make it visual I would say but for that like I think we should first refine the pitch of like what do we want to show like which problem are we solving and then I'm also like uh I'm

### **00:43:22**

**Lamphare:** Okay. I think ne next stage maybe I c I and the gan we can be a very uh

**Ulf Bissbort:** Yeah.

**Lamphare:** great combination because if gaven's work can be clearly make me understand because I can from a user perspective then I think uh yeah there will be no problem that for the broad user to understand our st uh our advantage

**Ulf Bissbort:** All right.

**leon.D. Garse:** Um but for the verific.

**Ulf Bissbort:** All right.

**leon.D. Garse:** Thank for your question. I think uh student shouldn't people give us these answers for what we need to verify what we need to for Yeah.

**Ulf Bissbort:** Yes. Uh, so my my questions were homework for Josh.

**leon.D. Garse:** Okay.

**Ulf Bissbort:** Sorry.

**leon.D. Garse:** I I I thought in that

**Ulf Bissbort:** Okay.

**leon.D. Garse:** um so um I I know it is not so by now we only I think is still questions about technical um but I think lamp and James has little thing to do for last week. So maybe something we can come up with what we can do for also for the

### **00:44:37**

**Lamphare:** Oh,

**leon.D. Garse:** two

**Lamphare:** don't worry. actually uh from the week to output we we our group plan after the given finish the technical validation we can uh in a a group to deliver the output maybe yeah but uh I also understand given they eager to share the output so that's why maybe from the week two only individual uh work. But I think from this uh this weekend uh especially after this meeting, I think I further understand both Josh and uh uh and uh this sorry I for Oh yeah yeah yeah yeah because we we still need to settle down to our go to market state uh uh go to market. Yeah. Uh MSD or C2PA just a technical or just a tour. Yeah. So, uh our users need uh the value we can create is the final point. So I think from this stage uh we we can work more closely with uh given yeah don't worry and we we can uh output in uh in the whole team

**Josh Kettlewell:** Sounds very good. Um, I'm very very late for my next call, so I really need to go.

**leon.D. Garse:** Just

**Josh Kettlewell:** Um, thank you very much. I'll send the meeting over.

**Ulf Bissbort:** Okay.

**leon.D. Garse:** kidding.

**Josh Kettlewell:** I'll send the videos over showing how we're using MSD and use cases and we'll organize a call for next week. We'll try and do an hour available. I'll put you as optional. We'll see.

**Ulf Bissbort:** Yeah, just just let me know the slots so I can tell you uh then.

**Josh Kettlewell:** probably be this time, same time next week,

**Ulf Bissbort:** Yeah.

**Lamphare:** Okay. Okay.

**Josh Kettlewell:** but it's up to you.

**Lamphare:** By the way, Joshua, will you share the meeting records for

**Ulf Bissbort:** Okay.

**Josh Kettlewell:** Yes,

**Lamphare:** us?

**Josh Kettlewell:** I'll put the meeting notes into into the WhatsApp and the notion.

**Lamphare:** Okay. Okay. No problem. Thank you.

**Josh Kettlewell:** Well done everyone. Great work.

**Ulf Bissbort:** Okay.

**Josh Kettlewell:** Cool.

**Ulf Bissbort:** Thanks everyone.

**Josh Kettlewell:** Bye.

**leon.D. Garse:** Okay.

**Josh Kettlewell:** Bye.

**Lamphare:** Thank you.

**Ulf Bissbort:** Bye-bye.

**Lamphare:** Bye.

**leon.D. Garse:** I

### **Transcription ended after 00:46:54**

*This editable transcript was computer generated and might contain errors. People can also change the text after it was created.*
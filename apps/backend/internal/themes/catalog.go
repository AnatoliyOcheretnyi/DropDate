package themes

// Group ids, in display order.
const (
	GroupLife      = "life"
	GroupMind      = "mind"
	GroupLove      = "love"
	GroupYouth     = "youth"
	GroupCrime     = "crime"
	GroupFear      = "fear"
	GroupAdventure = "adventure"
	GroupSpec      = "speculative"
	GroupSociety   = "society"
	GroupCraft     = "craft"
	GroupCozy      = "cozy"
)

var groupOrder = []struct {
	id    string
	label string
}{
	{GroupLife, "Життя і люди"},
	{GroupMind, "Психіка й свідомість"},
	{GroupLove, "Кохання"},
	{GroupYouth, "Молодість"},
	{GroupCrime, "Злочин і розслідування"},
	{GroupFear, "Страх"},
	{GroupAdventure, "Пригоди й виживання"},
	{GroupSpec, "Фантастика й фентезі"},
	{GroupSociety, "Суспільство й історія"},
	{GroupCraft, "Творчість і спорт"},
	{GroupCozy, "Затишне"},
}

// catalog is the curated theme list. Keyword sets are deliberately narrow: a
// broad keyword such as "disease" drags zombie outbreaks into "про хворобу",
// so the honest themes lean on specific keywords plus a genre hint instead.
var catalog = []Theme{
	// --- Життя і люди -------------------------------------------------------
	{
		ID: "illness", Label: "Про хворобу", Emoji: "🏥", Group: GroupLife,
		Keywords:      []int{kwCancer, kwTerminalIllness, kwAlzheimers, kwIllness},
		WithGenres:    []int{genreDrama},
		WithoutGenres: []int{genreHorror, genreSciFi},
	},
	{
		ID: "hospital", Label: "Лікарі й лікарня", Emoji: "🩺", Group: GroupLife,
		Keywords:      []int{kwHospital, kwDisease, kwDisability},
		WithGenres:    []int{genreDrama},
		WithoutGenres: []int{genreHorror},
	},
	{
		ID: "addiction", Label: "Залежність", Emoji: "🥃", Group: GroupLife,
		Keywords:   []int{kwAddiction, kwDrugAddiction, kwAlcoholism},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "grief", Label: "Втрата й горе", Emoji: "🕊️", Group: GroupLife,
		Keywords:   []int{kwGrief, kwLoss, kwLoneliness},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "family", Label: "Сімейні стосунки", Emoji: "👨‍👩‍👧", Group: GroupLife,
		Keywords:   []int{kwFamilyRelations, kwDysfunctionalFam, kwFatherSon, kwMotherDaughter},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "parenthood", Label: "Батьківство", Emoji: "🍼", Group: GroupLife,
		Keywords:   []int{kwSingleParent, kwAdoption, kwPregnancy},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "friendship", Label: "Дружба", Emoji: "🤝", Group: GroupLife,
		Keywords: []int{kwFriendship},
	},
	{
		ID: "true_story", Label: "Реальна історія", Emoji: "📖", Group: GroupLife,
		Keywords: []int{kwBasedOnTrueStory, kwTrueStory, kwBiography},
	},
	{
		ID: "midlife", Label: "Криза й пошук себе", Emoji: "🧭", Group: GroupLife,
		Keywords:   []int{kwMidlifeCrisis, kwIdentityCrisis, kwExistentialism},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "redemption", Label: "Другий шанс", Emoji: "🌅", Group: GroupLife,
		Keywords: []int{kwRedemption, kwSecondChance},
	},

	// --- Психіка й свідомість -----------------------------------------------
	{
		ID: "mental_health", Label: "Психічне здоровʼя", Emoji: "🧠", Group: GroupMind,
		Keywords:   []int{kwMentalIllness, kwDepression, kwTherapy, kwPsychiatrist},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "asylum", Label: "Психлікарня", Emoji: "🏚️", Group: GroupMind,
		Keywords: []int{kwMentalHospital, kwPsychiatricHospital, kwAsylum},
	},
	{
		ID: "trauma", Label: "Травма й ПТСР", Emoji: "💥", Group: GroupMind,
		Keywords:   []int{kwTrauma, kwPTSD},
		WithGenres: []int{genreDrama},
	},
	{
		ID: "memory", Label: "Памʼять і амнезія", Emoji: "🌫️", Group: GroupMind,
		Keywords: []int{kwAmnesia, kwNonlinearTimeline},
	},
	{
		ID: "mindbender", Label: "Головоломка з твістом", Emoji: "🧩", Group: GroupMind,
		Keywords: []int{kwTwistEnding, kwPsychologicalThrille, kwNonlinearTimeline},
	},

	// --- Кохання ------------------------------------------------------------
	{
		ID: "true_romance", Label: "Справжня романтика", Emoji: "💞", Group: GroupLove,
		Keywords:   []int{kwLove, kwRomance, kwFallingInLove},
		WithGenres: []int{genreRomance},
	},
	{
		ID: "first_love", Label: "Перше кохання", Emoji: "🌸", Group: GroupLove,
		Keywords:   []int{kwFirstLove, kwUnrequitedLove},
		WithGenres: []int{genreRomance},
	},
	{
		ID: "forbidden_love", Label: "Заборонене кохання", Emoji: "🔥", Group: GroupLove,
		Keywords: []int{kwForbiddenLove, kwInfidelity},
	},
	{
		ID: "love_triangle", Label: "Любовний трикутник", Emoji: "💔", Group: GroupLove,
		Keywords: []int{kwLoveTriangle, kwRomanticRivalry},
	},
	{
		ID: "marriage", Label: "Шлюб і розлучення", Emoji: "💍", Group: GroupLove,
		Keywords: []int{kwWedding, kwMarriageCrisis, kwDivorce},
	},
	{
		ID: "romcom", Label: "Романтична комедія", Emoji: "😍", Group: GroupLove,
		Keywords:   []int{kwRomanticComedy, kwLongDistanceLove},
		WithGenres: []int{genreRomance, genreComedy},
	},

	// --- Молодість ----------------------------------------------------------
	{
		ID: "teen_comedy", Label: "Молодіжна комедія", Emoji: "🎉", Group: GroupYouth,
		Keywords:   []int{kwTeenMovie, kwHighSchool, kwProm, kwParty},
		WithGenres: []int{genreComedy},
	},
	{
		ID: "coming_of_age", Label: "Дорослішання", Emoji: "🌱", Group: GroupYouth,
		Keywords: []int{kwComingOfAge, kwTeenager},
	},
	{
		ID: "school", Label: "Школа й вчителі", Emoji: "🏫", Group: GroupYouth,
		Keywords: []int{kwHighSchool, kwTeacher, kwStudent, kwBullying},
	},
	{
		ID: "college", Label: "Студентські роки", Emoji: "🎓", Group: GroupYouth,
		Keywords: []int{kwCollege, kwGraduation},
	},

	// --- Злочин і розслідування ---------------------------------------------
	{
		ID: "heist", Label: "Пограбування", Emoji: "💰", Group: GroupCrime,
		Keywords: []int{kwHeist, kwBankRobbery},
	},
	{
		ID: "serial_killer", Label: "Серійний вбивця", Emoji: "🔪", Group: GroupCrime,
		Keywords: []int{kwSerialKiller},
	},
	{
		ID: "detective", Label: "Детектив і розслідування", Emoji: "🕵️", Group: GroupCrime,
		Keywords: []int{kwDetective, kwInvestigation, kwMystery},
	},
	{
		ID: "mafia", Label: "Мафія й банди", Emoji: "🎩", Group: GroupCrime,
		Keywords: []int{kwMafia, kwGangster, kwGang, kwYakuza, kwDrugCartel},
	},
	{
		ID: "prison", Label: "Тюрма", Emoji: "⛓️", Group: GroupCrime,
		Keywords: []int{kwPrison, kwPrisonEscape},
	},
	{
		ID: "revenge", Label: "Помста", Emoji: "😤", Group: GroupCrime,
		Keywords: []int{kwRevenge, kwVigilante, kwHitman},
	},
	{
		ID: "courtroom", Label: "Суд і закон", Emoji: "⚖️", Group: GroupCrime,
		Keywords: []int{kwCourtroom, kwLawyer, kwTrial},
	},
	{
		ID: "spy", Label: "Шпигуни", Emoji: "🕶️", Group: GroupCrime,
		Keywords: []int{kwSpy, kwEspionage, kwUndercover},
	},
	{
		ID: "conspiracy", Label: "Змова й корупція", Emoji: "📰", Group: GroupCrime,
		Keywords: []int{kwConspiracy, kwCorruption, kwWhistleblower, kwJournalism},
	},

	// --- Страх --------------------------------------------------------------
	{
		ID: "haunted", Label: "Привиди й прокляті будинки", Emoji: "👻", Group: GroupFear,
		Keywords: []int{kwHauntedHouse, kwGhost, kwSupernatural},
	},
	{
		ID: "possession", Label: "Одержимість і екзорцизм", Emoji: "😈", Group: GroupFear,
		Keywords: []int{kwExorcism, kwDemon, kwWitch},
	},
	{
		ID: "zombie", Label: "Зомбі й епідемія", Emoji: "🧟", Group: GroupFear,
		Keywords: []int{kwZombie, kwEpidemic, kwPandemic},
	},
	{
		ID: "slasher", Label: "Маніяк і слешер", Emoji: "🩸", Group: GroupFear,
		Keywords: []int{kwSlasher, kwFoundFootage},
	},
	{
		ID: "cult", Label: "Секти й культи", Emoji: "🕯️", Group: GroupFear,
		Keywords: []int{kwCult},
	},
	{
		ID: "vampire", Label: "Вампіри й вовкулаки", Emoji: "🧛", Group: GroupFear,
		Keywords: []int{kwVampire, kwWerewolf},
	},

	// --- Пригоди й виживання ------------------------------------------------
	{
		ID: "survival", Label: "Виживання", Emoji: "🏕️", Group: GroupAdventure,
		Keywords:      []int{kwSurvival, kwWilderness, kwShipwreck, kwPlaneCrash},
		WithoutGenres: []int{genreHorror},
	},
	{
		ID: "road_trip", Label: "Подорож і роуд-муві", Emoji: "🚐", Group: GroupAdventure,
		Keywords: []int{kwRoadTrip, kwTravel},
	},
	{
		ID: "apocalypse", Label: "Апокаліпсис", Emoji: "☄️", Group: GroupAdventure,
		Keywords: []int{kwApocalypse, kwPostApocalyptic, kwNaturalDisaster},
	},
	{
		ID: "hostage", Label: "Заручники й втеча", Emoji: "🚨", Group: GroupAdventure,
		Keywords: []int{kwHostage, kwKidnapping, kwEscape},
	},
	{
		ID: "martial_arts", Label: "Бойові мистецтва", Emoji: "🥋", Group: GroupAdventure,
		Keywords: []int{kwMartialArts, kwKungFu, kwSamurai},
	},
	{
		ID: "pirates", Label: "Пірати й острови", Emoji: "🏴‍☠️", Group: GroupAdventure,
		Keywords: []int{kwPirate, kwIsland},
	},

	// --- Фантастика й фентезі -----------------------------------------------
	{
		ID: "space", Label: "Космос", Emoji: "🚀", Group: GroupSpec,
		Keywords: []int{kwSpaceTravel, kwSpaceStation, kwSpaceOpera},
	},
	{
		ID: "time_travel", Label: "Подорожі в часі", Emoji: "⏳", Group: GroupSpec,
		Keywords: []int{kwTimeTravel},
	},
	{
		ID: "ai_robots", Label: "ШІ й роботи", Emoji: "🤖", Group: GroupSpec,
		Keywords: []int{kwAI, kwRobot, kwCyberpunk, kwVR},
	},
	{
		ID: "aliens", Label: "Прибульці", Emoji: "👽", Group: GroupSpec,
		Keywords: []int{kwAlien},
	},
	{
		ID: "dystopia", Label: "Антиутопія", Emoji: "🏙️", Group: GroupSpec,
		Keywords: []int{kwDystopia},
	},
	{
		ID: "magic", Label: "Магія й чарівники", Emoji: "✨", Group: GroupSpec,
		Keywords: []int{kwMagic, kwWizard, kwFairyTale},
	},
	{
		ID: "myth", Label: "Міфи й Середньовіччя", Emoji: "🐉", Group: GroupSpec,
		Keywords: []int{kwMythology, kwMedieval},
	},
	{
		ID: "superhero", Label: "Супергерої", Emoji: "🦸", Group: GroupSpec,
		Keywords: []int{kwSuperhero},
	},
	{
		ID: "dinosaurs", Label: "Динозаври", Emoji: "🦖", Group: GroupSpec,
		Keywords: []int{kwDinosaur},
	},

	// --- Суспільство й історія ----------------------------------------------
	{
		ID: "war", Label: "Війна", Emoji: "🎖️", Group: GroupSociety,
		Keywords: []int{kwWar, kwSoldier, kwMilitary},
	},
	{
		ID: "ww2", Label: "Друга світова", Emoji: "🪖", Group: GroupSociety,
		Keywords: []int{kwWorldWarII, kwHolocaust},
	},
	{
		ID: "politics", Label: "Політика", Emoji: "🏛️", Group: GroupSociety,
		Keywords: []int{kwPolitics, kwColdWar},
	},
	{
		ID: "injustice", Label: "Нерівність і несправедливість", Emoji: "✊", Group: GroupSociety,
		Keywords: []int{kwRacism, kwPoverty, kwClassDifference},
	},
	{
		ID: "immigration", Label: "Еміграція й пошук дому", Emoji: "🧳", Group: GroupSociety,
		Keywords: []int{kwImmigrant},
	},
	{
		ID: "lgbt", Label: "ЛГБТ-історії", Emoji: "🏳️‍🌈", Group: GroupSociety,
		Keywords: []int{kwLGBT},
	},
	{
		ID: "feminism", Label: "Жіночі історії", Emoji: "💪", Group: GroupSociety,
		Keywords: []int{kwFeminism},
	},

	// --- Творчість і спорт --------------------------------------------------
	{
		ID: "music", Label: "Музика", Emoji: "🎵", Group: GroupCraft,
		Keywords: []int{kwMusic, kwMusician, kwRockBand},
	},
	{
		ID: "dance", Label: "Танець", Emoji: "💃", Group: GroupCraft,
		Keywords: []int{kwDance},
	},
	{
		ID: "artists", Label: "Художники й письменники", Emoji: "🎨", Group: GroupCraft,
		Keywords: []int{kwPainter, kwWriter, kwArtist},
	},
	{
		ID: "sport", Label: "Спорт", Emoji: "🏆", Group: GroupCraft,
		Keywords: []int{kwSports, kwBoxing, kwOlympics},
	},

	// --- Затишне ------------------------------------------------------------
	{
		ID: "christmas", Label: "Різдво й свята", Emoji: "🎄", Group: GroupCozy,
		Keywords: []int{kwChristmas, kwHoliday, kwNewYearEve},
	},
	{
		ID: "food", Label: "Їжа й кулінарія", Emoji: "🍜", Group: GroupCozy,
		Keywords: []int{kwCooking, kwChef, kwRestaurant, kwFood},
	},
	{
		ID: "animals", Label: "Тварини", Emoji: "🐶", Group: GroupCozy,
		Keywords: []int{kwDog, kwCat, kwHorse},
	},
	{
		ID: "small_town", Label: "Мале місто", Emoji: "🏘️", Group: GroupCozy,
		Keywords: []int{kwSmallTown},
	},
	{
		ID: "workplace", Label: "Робота й офіс", Emoji: "💼", Group: GroupCozy,
		Keywords: []int{kwWorkplace, kwOffice},
	},
}

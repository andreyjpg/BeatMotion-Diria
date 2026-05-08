import MenuButton from "@/components/MenuButton";
import { useCourseMemberByUser } from "@/hooks/courseMember/useCourseMemberByUser";
import { useAvailableSurveys } from "@/hooks/surveys/useAvailableSurveys";
import { useActiveUser } from "@/hooks/user/UseActiveUser";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { JSX } from "react";
import { ScrollView, Text, TouchableHighlight, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MyCourses from "./myCourses";

type MenuProps = {
  icon: JSX.Element;
  label: string;
  route: string;
};
const MENU: MenuProps[] = [
  {
    icon: <FontAwesome5 name="money-check" size={36} color="turquoise" />,
    label: "Centro de pagos",
    route: "/private/user/payment/paymentCenter",
  },
  {
    icon: (
      <MaterialCommunityIcons
        name="clipboard-check-outline"
        size={44}
        color="turquoise"
      />
    ),
    label: "Encuesta",
    route: "/private/user/surveys/list",
  },
  {
    icon: (
      <MaterialCommunityIcons
        name="clipboard-check-outline"
        size={44}
        color="turquoise"
      />
    ),
    label: "Eventos",
    route: "/private/user/events",
  },
  {
    icon: <Icon name="bag-outline" size={44} color="turquoise" />,
    label: "Gestionar tienda",
    route: "/private/marketplace/MarketplaceList",
  },
];

const HomeUser = () => {
  const router = useRouter();
  const { user } = useActiveUser();

  const courseMemberQuery = useCourseMemberByUser(user?.uid || "");
  const courseIds = courseMemberQuery.data?.map((cm) => cm.courseId) || [];
  const surveysQuery = useAvailableSurveys(user?.uid || "", courseIds);
  const pendingSurveys = surveysQuery.data?.length || 0;

  const handleClickEnroll = () => {
    router.push("/private/user/enrollment/createEnrollment");
  };

  const handleGoToRoute = (uri: string) => {
    router.push(uri as Href);
  };

  return (
    <View className="px-6 py-12">
      <TouchableHighlight
        className="bg-primary self-end text-gray-950 w-1/2 rounded-full px-3 py-3 justify-center active:opacity-80 mb-8"
        onPress={handleClickEnroll}
      >
        <View className="flex-row gap-2 items-center justify-center">
          <Icon name="add-circle-outline" size={20} />
          <Text className="text-darkText gap-2 font-bold">
            Matricular Curso
          </Text>
        </View>
      </TouchableHighlight>

      <MyCourses />
      <ScrollView className="h-96">
        <View className="flex-row flex-wrap mt-3">
          {MENU.map((item: MenuProps) => (
            <View key={item.label} className="w-1/2 p-2">
              <MenuButton
                {...item}
                onPress={() => handleGoToRoute(item.route)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeUser;

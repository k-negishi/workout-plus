/**
 * ExerciseHistoryFullScreen - 種目履歴フルスクリーン画面
 * ワイヤーフレーム: screen-history-full セクション準拠
 *
 * T058: 統計サマリーセクション
 * T059: 重量推移チャート（react-native-gifted-charts BarChart）
 * T060: PR履歴 + 全履歴リスト
 * Issue #155: カスタム種目のみヘッダー右上に ✎ 🗑 アイコン表示
 *             ✎ → インラインフォームで編集・保存
 *             🗑 → 確認ダイアログ → 論理削除 → 前画面に戻る
 * Issue #142: ヘッダースタイル統一（Ionicons chevron-back に変更）
 */
import { Ionicons } from '@expo/vector-icons';
import type { ParamListBase, RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Polyline, Svg } from 'react-native-svg';

import { ExerciseRepository } from '@/database/repositories/exercise';
import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/shared/constants';
import type { Equipment, MuscleGroup } from '@/types';

import { useExerciseHistory } from '../hooks/useExerciseHistory';

/** チェックアイコン（DaySummary と同じデザイン） */
function CheckIcon() {
  return (
    <Svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.success}
      strokeWidth={2}
    >
      <Polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * HomeStack / CalendarStack / RecordStack の3スタックで共通使用するため、
 * route params はスタック固有の ParamList に依存しないよう inline で定義する。
 * goBack() のみ使用するため navigation 型は ParamListBase で十分。
 */
type ExerciseHistoryRoute = RouteProp<
  { ExerciseHistory: { exerciseId: string; exerciseName: string } },
  'ExerciseHistory'
>;

/** PR種別の日本語ラベル */
const PR_TYPE_LABELS: Record<string, string> = {
  max_weight: '最大重量 (1RM推定)',
  max_volume: '最大ボリューム (1セッション)',
  max_reps: '最大レップス',
};

/** PR値のフォーマット */
function formatPRValue(prType: string, value: number): string {
  switch (prType) {
    case 'max_weight': {
      return `${value}kg`;
    }
    case 'max_volume': {
      return `${value.toLocaleString()}kg`;
    }
    case 'max_reps': {
      return `${value}回`;
    }
    default: {
      return `${value}`;
    }
  }
}

/** 曜日ラベル */
const DAY_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 日付を「M月D日(曜日)」形式にフォーマット */
function formatJapaneseDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = DAY_OF_WEEK[date.getDay()]!;
  return `${month}月${day}日(${dayOfWeek})`;
}

/** 部位チップ選択肢 */
const MUSCLE_GROUP_OPTIONS: Array<{ key: MuscleGroup; label: string }> = [
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背中' },
  { key: 'legs', label: '脚' },
  { key: 'shoulders', label: '肩' },
  { key: 'biceps', label: '二頭筋' },
  { key: 'triceps', label: '三頭筋' },
  { key: 'abs', label: '腹筋' },
];

/** 器具チップ選択肢 */
const EQUIPMENT_OPTIONS: Array<{ key: Equipment; label: string }> = [
  { key: 'barbell', label: 'バーベル' },
  { key: 'dumbbell', label: 'ダンベル' },
  { key: 'machine', label: 'マシン' },
  { key: 'cable', label: 'ケーブル' },
  { key: 'bodyweight', label: '自重' },
];

/**
 * Issue #155: カスタム種目編集フォームコンポーネント
 * ヘッダー下に展開するインラインフォーム
 */
const ExerciseEditForm: React.FC<{
  editName: string;
  editMuscleGroup: MuscleGroup;
  editEquipment: Equipment;
  onNameChange: (text: string) => void;
  onMuscleGroupChange: (mg: MuscleGroup) => void;
  onEquipmentChange: (eq: Equipment) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({
  editName,
  editMuscleGroup,
  editEquipment,
  onNameChange,
  onMuscleGroupChange,
  onEquipmentChange,
  onSave,
  onCancel,
}) => (
  <View style={editFormStyles.container}>
    <TextInput
      style={editFormStyles.nameInput}
      placeholder="種目名"
      value={editName}
      onChangeText={onNameChange}
      autoFocus
    />
    <Text style={editFormStyles.sectionLabel}>部位</Text>
    <View style={editFormStyles.chipRow}>
      {MUSCLE_GROUP_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onMuscleGroupChange(opt.key)}
          style={[editFormStyles.chip, editMuscleGroup === opt.key && editFormStyles.chipSelected]}
        >
          <Text
            style={[
              editFormStyles.chipText,
              editMuscleGroup === opt.key && editFormStyles.chipTextSelected,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <Text style={editFormStyles.sectionLabel}>器具</Text>
    <View style={editFormStyles.chipRow}>
      {EQUIPMENT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          onPress={() => onEquipmentChange(opt.key)}
          style={[editFormStyles.chip, editEquipment === opt.key && editFormStyles.chipSelected]}
        >
          <Text
            style={[
              editFormStyles.chipText,
              editEquipment === opt.key && editFormStyles.chipTextSelected,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
    <View style={editFormStyles.buttonRow}>
      <TouchableOpacity onPress={onSave} style={editFormStyles.saveButton}>
        <Text style={editFormStyles.saveButtonText}>保存</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onCancel} style={editFormStyles.cancelButton}>
        <Text style={editFormStyles.cancelButtonText}>キャンセル</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export function ExerciseHistoryFullScreen() {
  // goBack() のみ使用するため ParamListBase で十分（スタック非依存）
  const route = useRoute<ExerciseHistoryRoute>();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const { exerciseId, exerciseName } = route.params;
  // SafeArea 対応: ノッチ・ダイナミックアイランド対応
  const insets = useSafeAreaInsets();

  // 種目履歴データ（isCustom を追加で取得）
  const { stats, weeklyData, prHistory, allHistory, loading, isCustom } =
    useExerciseHistory(exerciseId);

  // Issue #155: ヘッダー表示名（編集後に更新するため state 管理）
  const [displayName, setDisplayName] = useState(exerciseName);

  // Issue #155: インライン編集フォームの表示状態
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(exerciseName);
  const [editMuscleGroup, setEditMuscleGroup] = useState<MuscleGroup>('chest');
  const [editEquipment, setEditEquipment] = useState<Equipment>('barbell');

  // Issue #195: 直近3ヶ月の最大RM推移グラフ用データ
  const chartData = weeklyData.map((w) => ({
    value: w.maxEstimated1RM,
    label: w.weekLabel,
  }));

  /**
   * Issue #155: 編集フォームを開く
   * DB から現在の部位・器具を取得してフォームにセットする
   */
  const handleStartEdit = useCallback(async () => {
    const row = await ExerciseRepository.findById(exerciseId);
    if (row) {
      setEditName(row.name);
      setEditMuscleGroup(row.muscle_group);
      setEditEquipment(row.equipment);
    }
    setIsEditing(true);
  }, [exerciseId]);

  /**
   * Issue #155: 編集内容を保存する
   * 保存後はフォームを閉じてヘッダーの種目名を更新する
   */
  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim()) return;
    await ExerciseRepository.update(exerciseId, {
      name: editName.trim(),
      muscle_group: editMuscleGroup,
      equipment: editEquipment,
    });
    setDisplayName(editName.trim());
    setIsEditing(false);
  }, [exerciseId, editName, editMuscleGroup, editEquipment]);

  /**
   * Issue #155: カスタム種目を論理削除する
   * 確認ダイアログ表示 → 削除 → 種目選択画面に戻る
   * 過去のワークアウト記録は保持するため softDelete（論理削除）を使用
   */
  const handleDelete = useCallback(() => {
    Alert.alert(`${displayName}を削除しますか？`, '削除後も過去のワークアウト記録は残ります。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await ExerciseRepository.softDelete(exerciseId);
          navigation.goBack();
        },
      },
    ]);
  }, [displayName, exerciseId, navigation]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Issue #142: 白ヘッダー（統一スタイル）
          変更点: BackArrow+テキスト「戻る」→ Ionicons chevron-back のみ
                  paddingTop: insets.top + 12 → insets.top のみ（paddingBottom: 12 で吸収）
                  testID / accessibilityLabel を追加 */}
      <View
        testID="exercise-history-header"
        style={{
          backgroundColor: colors.white,
          paddingTop: insets.top,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* 戻るボタン: BackArrow + テキストから Ionicons chevron-back のみに変更 */}
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="戻る"
          style={{ width: 40, alignItems: 'flex-start' }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        {/* タイトル: 中央寄せ（Issue #213: fontSize 17 → 20 に拡大） */}
        <Text
          testID="exercise-history-header-title"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: fontSize.lg,
            fontWeight: fontWeight.semibold,
            color: colors.textTertiary,
          }}
        >
          {displayName}
        </Text>

        {/* Issue #155: カスタム種目のみ編集・削除アイコンを表示 */}
        {isCustom ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 4,
              alignItems: 'center',
              width: 72,
              justifyContent: 'flex-end',
            }}
          >
            <Pressable
              testID="edit-button"
              onPress={handleStartEdit}
              hitSlop={8}
              accessibilityLabel="種目を編集"
              style={{ padding: 6 }}
            >
              <Ionicons name="create-outline" size={22} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              testID="delete-button"
              onPress={handleDelete}
              hitSlop={8}
              accessibilityLabel="種目を削除"
              style={{ padding: 6 }}
            >
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          </View>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {/* Issue #155: 編集フォーム（isEditing の場合にヘッダー下に展開） */}
      {!!isEditing && (
        <ExerciseEditForm
          editName={editName}
          editMuscleGroup={editMuscleGroup}
          editEquipment={editEquipment}
          onNameChange={setEditName}
          onMuscleGroupChange={setEditMuscleGroup}
          onEquipmentChange={setEditEquipment}
          onSave={handleSaveEdit}
          onCancel={() => setIsEditing(false)}
        />
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-5">
          {/* === T058: 統計サマリー（6項目・3列グリッド）===
              Issue #195: 3列表示に変更し、総ボリュームを6番目の項目として追加 */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            {/* 最高重量: 全セット中の最大重量 */}
            <StatCard label="最高重量" value={`${stats.maxWeight}`} unit="kg" />
            {/* 最高1RM: Epley式による推定1RM（データなしは「-」表示） */}
            {stats.maxEstimated1RM > 0 ? (
              <StatCard label="最高1RM" value={`${Math.round(stats.maxEstimated1RM)}`} unit="kg" />
            ) : (
              <StatCard label="最高1RM" value="-" />
            )}
            {/* 最高rep数: 全セット中の最大レップ数（単位なし） */}
            <StatCard label="最高rep数" value={`${stats.maxReps}`} />
            {/* ワークアウト数: この種目を実施したワークアウト数（単位なし。旧「総ワークアウト回数」を短縮） */}
            <StatCard label="ワークアウト数" value={`${stats.totalSessions}`} />
            {/* 総セット: 全ワークアウト合算のセット数（単位なし） */}
            <StatCard label="総セット" value={`${stats.totalSets}`} />
            {/* 総ボリューム: 全セット合算の重量×回数（単位 kg、3桁区切り） */}
            <StatCard label="総ボリューム" value={stats.totalVolume.toLocaleString()} unit="kg" />
          </View>

          {/* === T059: 直近3ヶ月の最大RM推移チャート（LineChart）===
              Issue #195: BarChart（週平均重量）→ LineChart（週最大推定1RM）に変更 */}
          {chartData.length > 0 ? (
            <View className="mt-6">
              {/* Issue #213: text-sm → text-base に拡大 */}
              <Text className="text-base font-bold text-text-primary mb-4">
                直近3ヶ月の最大RM推移
              </Text>
              <View
                className="bg-white rounded-lg p-4"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                <LineChart
                  data={chartData}
                  color={colors.primary}
                  thickness={2}
                  dataPointsColor={colors.primary}
                  dataPointsRadius={4}
                  xAxisThickness={1}
                  yAxisThickness={1}
                  xAxisColor={colors.border}
                  yAxisColor={colors.border}
                  yAxisTextStyle={{ fontSize: 10, color: colors.textSecondary }}
                  xAxisLabelTextStyle={{ fontSize: 9, color: colors.textSecondary }}
                  noOfSections={5}
                  maxValue={Math.ceil(Math.max(...chartData.map((d) => d.value), 1) * 1.2)}
                  isAnimated
                />
              </View>
            </View>
          ) : null}

          {/* === T060: PR履歴 === */}
          {prHistory.length > 0 ? (
            <View className="mt-6">
              {/* Issue #213: text-sm → text-base に拡大 */}
              <Text className="text-base font-bold text-text-primary mb-3">
                PR (自己ベスト) 履歴
              </Text>
              {prHistory.map((pr, idx) => (
                <View
                  key={idx}
                  className="bg-white rounded-sm p-3 mb-2 flex-row justify-between items-center"
                  style={{ borderWidth: 1, borderColor: colors.border }}
                >
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                      {PR_TYPE_LABELS[pr.prType] ?? pr.prType}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-1">
                      {format(new Date(pr.achievedAt), 'yyyy-MM-dd')}
                    </Text>
                  </View>
                  <Text className="text-base font-bold" style={{ color: colors.textPrimary }}>
                    {formatPRValue(pr.prType, pr.value)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* === T060: 全履歴リスト === */}
          <View className="mt-6 mb-20">
            {/* Issue #213: text-sm → text-base に拡大 */}
            <Text className="text-base font-bold text-text-primary mb-3">
              全履歴 ({stats.totalSessions}回)
            </Text>
            {allHistory.map((session) => (
              <View
                key={session.workoutId}
                style={{
                  backgroundColor: colors.white,
                  borderRadius: 4,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {/* 日付行 */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  {/* Issue #213: fontSize 13 → 15 に拡大 */}
                  <Text
                    testID="exercise-history-date-text"
                    style={{ fontSize: 15, color: colors.textPrimary }}
                  >
                    {formatJapaneseDate(session.completedAt)}
                  </Text>
                  {session.hasPR ? (
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 2,
                        backgroundColor: colors.primaryBg,
                      }}
                    >
                      <Text
                        style={{ fontSize: 10, fontWeight: fontWeight.bold, color: colors.primary }}
                      >
                        PR
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* セット詳細（DaySummary パターン統一） */}
                <View style={{ gap: 6 }}>
                  {session.sets.map((set) => (
                    <View
                      key={set.setNumber}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderRadius: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: '#f0fdf4',
                        gap: 8,
                      }}
                    >
                      <CheckIcon />
                      <Text style={{ fontSize: 15, color: colors.textSecondary, width: 14 }}>
                        {set.setNumber}
                      </Text>
                      {/* 重量×rep数: 視認性向上のため 16px→18px に拡大 */}
                      <Text
                        style={{
                          fontSize: fontSize.md,
                          fontWeight: fontWeight.semibold,
                          flex: 1,
                          color: colors.textTertiary,
                        }}
                      >
                        {set.weight ?? '-'}kg × {set.reps ?? '-'}
                      </Text>
                      {set.estimated1RM == null ? null : (
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          1RM: {Math.round(set.estimated1RM)}kg
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * 統計サマリー個別カード。
 * Issue #195: 6項目・3列グリッド対応のため width を 31% に変更（gap=8 考慮）。
 *   - 数値・ラベルを中央寄せ
 *   - 値の文字数が増えると枠からはみ出すため、文字数に応じてフォントサイズを動的調整
 * Issue #188: 数値の視認性向上のため value フォントを 22px・label を 13px に拡大。
 */
function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  // 値の文字数に応じてフォントサイズを動的調整（長い数値がカードからはみ出ないよう制御）
  // 例: "9"(1) → 22px, "1,000"(5) → 18px, "10,000"(6) → 18px, "100,000"(7) → 15px
  let valueFontSize = 13;
  if (value.length <= 4)
    valueFontSize = fontSize.xl; // 22px
  else if (value.length <= 6)
    valueFontSize = fontSize.md; // 18px
  else if (value.length <= 8) valueFontSize = 15; // 定数なし・そのまま

  return (
    <View
      className="bg-white rounded-sm p-3"
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        // 3列グリッド: gap=8（2箇所）を考慮して 31% で3列ぴったり並ぶ
        width: '31%',
        alignItems: 'center',
      }}
    >
      {/* ラベル: 中央寄せ・長いラベルは自動縮小して1行に収める */}
      <Text
        style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
        {/* 値: 文字数に応じてフォントサイズ動的調整 */}
        <Text
          style={{
            fontSize: valueFontSize,
            fontWeight: fontWeight.bold,
            color: colors.textPrimary,
          }}
        >
          {value}
        </Text>
        {unit ? (
          <Text style={{ fontSize: 13, marginLeft: 2, color: colors.textSecondary }}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Issue #155: 編集フォームスタイル */
const editFormStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: spacing.md - 4,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md - 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

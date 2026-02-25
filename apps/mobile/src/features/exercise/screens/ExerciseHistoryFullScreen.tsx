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
import { BarChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Polyline, Svg } from 'react-native-svg';

import { ExerciseRepository } from '@/database/repositories/exercise';
import { colors } from '@/shared/constants/colors';
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
    case 'max_weight':
      return `${value}kg`;
    case 'max_volume':
      return `${value.toLocaleString()}kg`;
    case 'max_reps':
      return `${value}回`;
    default:
      return `${value}`;
  }
}

/** 重量を表示用にフォーマット */
function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${kg.toLocaleString()}kg`;
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

  // チャートデータ変換
  const chartData = weeklyData.map((w) => ({
    value: w.averageWeight,
    label: w.weekLabel,
    frontColor: colors.primary,
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
    Alert.alert(
      `${displayName}を削除しますか？`,
      '削除後も過去のワークアウト記録は残ります。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await ExerciseRepository.softDelete(exerciseId);
            navigation.goBack();
          },
        },
      ],
    );
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
          backgroundColor: '#FFFFFF',
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
          <Ionicons name="chevron-back" size={24} color="#475569" />
        </Pressable>

        {/* タイトル: 中央寄せ（fontSize 17 / fontWeight '600' に統一） */}
        <Text
          testID="exercise-history-header-title"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: '#334155',
          }}
        >
          {displayName}
        </Text>

        {/* Issue #155: カスタム種目のみ編集・削除アイコンを表示 */}
        {isCustom ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', width: 40, justifyContent: 'flex-end' }}>
            <Pressable
              testID="edit-button"
              onPress={handleStartEdit}
              hitSlop={8}
              accessibilityLabel="種目を編集"
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>{'✎'}</Text>
            </Pressable>
            <Pressable
              testID="delete-button"
              onPress={handleDelete}
              hitSlop={8}
              accessibilityLabel="種目を削除"
            >
              <Text style={{ fontSize: 18, color: '#EF4444' }}>{'🗑'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Issue #155: 編集フォーム（isEditing の場合にヘッダー下に展開） */}
      {isEditing && (
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
          {/* === T058: 統計サマリー (6項目グリッド) === */}
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <StatCard label="最大重量" value={`${stats.maxWeight}`} unit="kg" />
            <StatCard
              label="最大ボリューム"
              value={`${stats.maxVolume.toLocaleString()}`}
              unit="kg"
            />
            <StatCard label="平均重量" value={`${stats.averageWeight}`} unit="kg" />
            {/* 「総トレ回数」→「総セット数」に変更 (#113) */}
            <StatCard label="総セット数" value={`${stats.totalSets}`} unit="セット" />
            <StatCard label="総ボリューム" value={formatVolume(stats.totalVolume)} />
            {/* 「最終PR」→「最高RM」に変更: Epley式による推定1RMを表示 (#114) */}
            {stats.maxEstimated1RM > 0 ? (
              <StatCard label="最高RM" value={`${Math.round(stats.maxEstimated1RM)}`} unit="kg" />
            ) : (
              <StatCard label="最高RM" value="-" />
            )}
          </View>

          {/* === T059: 重量推移チャート === */}
          {chartData.length > 0 ? (
            <View className="mt-6">
              <Text className="text-sm font-bold text-text-primary mb-4">
                過去3ヶ月の重量推移 (週平均)
              </Text>
              <View
                className="bg-white rounded-lg p-4"
                style={{ borderWidth: 1, borderColor: colors.border }}
              >
                <BarChart
                  data={chartData}
                  barWidth={20}
                  spacing={12}
                  roundedTop
                  roundedBottom
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
              <Text className="text-sm font-bold text-text-primary mb-3">PR (自己ベスト) 履歴</Text>
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
            <Text className="text-sm font-bold text-text-primary mb-3">
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
                  <Text style={{ fontSize: 13, color: colors.textPrimary }}>
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
                      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
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
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '600',
                          flex: 1,
                          color: '#334155',
                        }}
                      >
                        {set.weight ?? '-'}kg × {set.reps ?? '-'}
                      </Text>
                      {set.estimated1RM != null ? (
                        <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                          1RM: {Math.round(set.estimated1RM)}kg
                        </Text>
                      ) : null}
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

/** 統計サマリー個別カード */
function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View
      className="bg-white rounded-sm p-3"
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        width: '31%',
        minWidth: 100,
      }}
    >
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
      <View className="flex-row items-end mt-1">
        <Text className="text-lg font-bold" style={{ color: colors.textPrimary }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-xs ml-0.5" style={{ color: colors.textSecondary }}>
            {unit}
          </Text>
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
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  nameInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#475569',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSelected: {
    backgroundColor: '#E6F2FF',
    borderColor: '#4D94FF',
  },
  chipText: {
    fontSize: 14,
    color: '#64748b',
  },
  chipTextSelected: {
    color: '#4D94FF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#4D94FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#64748b',
  },
});
